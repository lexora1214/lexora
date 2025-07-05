import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, increment, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User, Role, Customer, CommissionSettings, IncomeRecord, ProductSale } from "@/types";
import type { User as FirebaseUser } from 'firebase/auth';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createUserProfile(firebaseUser: FirebaseUser, name: string, role: Role, referralCodeInput: string): Promise<User> {
  let referrerId: string | null = null;
  const isReferralNeeded = role && !['Regional Director', 'Admin', 'Shop Manager'].includes(role);

  if (isReferralNeeded) {
    if (!referralCodeInput || referralCodeInput.length !== 6) {
      throw new Error("A valid 6-character referral code is required for this role.");
    }
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", referralCodeInput));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Invalid referrer code. Please check the code and try again.");
    }
    
    const referrerDoc = querySnapshot.docs[0];
    referrerId = referrerDoc.id;
  }
  
  let newReferralCode = '';
  const isReferralCodeNeeded = role && !['Salesman', 'Shop Manager'].includes(role);
  
  if (isReferralCodeNeeded) {
    let isCodeUnique = false;
    const usersCollection = collection(db, "users");
    while (!isCodeUnique) {
      newReferralCode = generateReferralCode();
      const codeQuery = query(usersCollection, where("referralCode", "==", newReferralCode));
      const codeSnapshot = await getDocs(codeQuery);
      if (codeSnapshot.empty) {
        isCodeUnique = true;
      }
    }
  }

  const newUser: User = {
    id: firebaseUser.uid,
    name,
    email: firebaseUser.email!,
    role: role,
    referralCode: newReferralCode,
    referrerId: referrerId,
    totalIncome: 0,
    avatar: `https://placehold.co/100x100.png`,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", firebaseUser.uid), newUser);
  return newUser;
}

export async function getUser(uid: string): Promise<User | null> {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data() as User;
    }
    return null;
}

export async function getAllUsers(): Promise<User[]> {
    const usersCol = collection(db, "users");
    const usersSnap = await getDocs(usersCol);
    return usersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
}

export async function getCustomersForSalesman(salesmanId: string): Promise<Customer[]> {
    const customersCol = collection(db, "customers");
    const q = query(customersCol, where("salesmanId", "==", salesmanId));
    const customersSnap = await getDocs(q);
    return customersSnap.docs.map(doc => doc.data() as Customer);
}

export async function getAllCustomers(): Promise<Customer[]> {
    const customersCol = collection(db, "customers");
    const customersSnap = await getDocs(customersCol);
    return customersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
}

const DEFAULT_COMMISSIONS: CommissionSettings = {
  tokenPrice: 2000,
  salesman: 600,
  teamOperationManager: 400,
  groupOperationManager: 250,
  headGroupManager: 150,
  regionalDirector: 100,
  admin: 400,
};

export async function getCommissionSettings(): Promise<CommissionSettings> {
  const settingsDocRef = doc(db, "settings", "commissions");
  const settingsDocSnap = await getDoc(settingsDocRef);
  if (settingsDocSnap.exists()) {
    const data = settingsDocSnap.data();
    return { ...DEFAULT_COMMISSIONS, ...data };
  }
  await setDoc(settingsDocRef, DEFAULT_COMMISSIONS);
  return DEFAULT_COMMISSIONS;
}

export async function updateCommissionSettings(data: CommissionSettings): Promise<void> {
  const settingsDocRef = doc(db, "settings", "commissions");
  await setDoc(settingsDocRef, data, { merge: true });
}

export async function createCustomer(customerData: Omit<Customer, 'id' | 'saleDate' | 'commissionDistributed' | 'salesmanId'>, salesman: User): Promise<void> {
    const batch = writeBatch(db);
    const allUsers = await getAllUsers();
    const settings = await getCommissionSettings();
    
    const newCustomerRef = doc(collection(db, "customers"));
    const saleDate = new Date().toISOString();
    const newCustomer: Customer = {
        ...customerData,
        id: newCustomerRef.id,
        salesmanId: salesman.id,
        saleDate: saleDate,
        commissionDistributed: true, // This is for token sale, assuming it's paid out
    };
    batch.set(newCustomerRef, newCustomer);

    const commissionAmounts: Record<Role, number> = {
        "Salesman": settings.salesman,
        "Team Operation Manager": settings.teamOperationManager,
        "Group Operation Manager": settings.groupOperationManager,
        "Head Group Manager": settings.headGroupManager,
        "Regional Director": settings.regionalDirector,
        "Admin": 0,
        "Shop Manager": 0,
    };

    let currentUser: User | undefined = salesman;
    
    while(currentUser) {
        const commission = commissionAmounts[currentUser.role] || 0;
        if (commission > 0) {
            const userRef = doc(db, "users", currentUser.id);
            batch.update(userRef, { totalIncome: increment(commission) });

            const incomeRecordRef = doc(collection(db, "incomeRecords"));
            const newIncomeRecord: IncomeRecord = {
                id: incomeRecordRef.id,
                userId: currentUser.id,
                amount: commission,
                saleDate: saleDate,
                grantedForRole: currentUser.role,
                salesmanId: salesman.id,
                salesmanName: salesman.name,
                sourceType: 'token_sale',
                customerId: newCustomer.id,
                customerName: newCustomer.name,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
        
        if (currentUser.referrerId) {
            currentUser = allUsers.find(u => u.id === currentUser!.referrerId);
        } else {
            currentUser = undefined;
        }
    }

    const adminCommission = settings.admin;
    if (adminCommission > 0) {
        const adminUsers = allUsers.filter(u => u.role === 'Admin');
        for (const adminUser of adminUsers) {
            const userRef = doc(db, "users", adminUser.id);
            batch.update(userRef, { totalIncome: increment(adminCommission) });

            const incomeRecordRef = doc(collection(db, "incomeRecords"));
            const newIncomeRecord: IncomeRecord = {
                id: incomeRecordRef.id,
                userId: adminUser.id,
                amount: adminCommission,
                saleDate: saleDate,
                grantedForRole: 'Admin',
                salesmanId: salesman.id,
                salesmanName: salesman.name,
                sourceType: 'token_sale',
                customerId: newCustomer.id,
                customerName: newCustomer.name,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
    }

    await batch.commit();
}


// --- Product Sale and Commission Logic ---

const getProductCommissionRates = (price: number, paymentMethod: 'cash' | 'installments'): Omit<Record<Role, number>, "Shop Manager"> => {
    const isInstallments = paymentMethod === 'installments';
    if (price >= 20000 && price < 30000) {
        return {
            "Salesman": isInstallments ? 960 : 1600,
            "Team Operation Manager": isInstallments ? 600 : 1000,
            "Group Operation Manager": isInstallments ? 240 : 400,
            "Head Group Manager": isInstallments ? 150 : 250,
            "Regional Director": isInstallments ? 150 : 250,
            "Admin": isInstallments ? 900 : 1500,
        };
    }
    if (price >= 30000 && price < 50000) {
        return {
            "Salesman": isInstallments ? 1280 : 1920,
            "Team Operation Manager": isInstallments ? 800 : 1200,
            "Group Operation Manager": isInstallments ? 320 : 480,
            "Head Group Manager": isInstallments ? 200 : 300,
            "Regional Director": isInstallments ? 200 : 300,
            "Admin": isInstallments ? 1200 : 1800,
        };
    }
    if (price >= 50000 && price < 75000) {
        return {
            "Salesman": isInstallments ? 1600 : 2560,
            "Team Operation Manager": isInstallments ? 1000 : 1600,
            "Group Operation Manager": isInstallments ? 400 : 640,
            "Head Group Manager": isInstallments ? 250 : 400,
            "Regional Director": isInstallments ? 250 : 400,
            "Admin": isInstallments ? 1500 : 2400,
        };
    }
    if (price >= 75000 && price < 100000) {
        return {
            "Salesman": isInstallments ? 2240 : 3200,
            "Team Operation Manager": isInstallments ? 1400 : 2000,
            "Group Operation Manager": isInstallments ? 560 : 800,
            "Head Group Manager": isInstallments ? 350 : 500,
            "Regional Director": isInstallments ? 350 : 500,
            "Admin": isInstallments ? 2100 : 3000,
        };
    }
    if (price >= 100000 && price < 250000) {
        return {
            "Salesman": isInstallments ? 2560 : 3520,
            "Team Operation Manager": isInstallments ? 1600 : 2200,
            "Group Operation Manager": isInstallments ? 640 : 880,
            "Head Group Manager": isInstallments ? 400 : 550,
            "Regional Director": isInstallments ? 400 : 550,
            "Admin": isInstallments ? 2400 : 3300,
        };
    }
     if (price >= 250000) {
        return {
            "Salesman": isInstallments ? 3520 : 4480,
            "Team Operation Manager": isInstallments ? 2200 : 2800,
            "Group Operation Manager": isInstallments ? 880 : 1120,
            "Head Group Manager": isInstallments ? 550 : 700,
            "Regional Director": isInstallments ? 550 : 700,
            "Admin": isInstallments ? 3300 : 4200,
        };
    }
    return { "Salesman": 0, "Team Operation Manager": 0, "Group Operation Manager": 0, "Head Group Manager": 0, "Regional Director": 0, "Admin": 0 };
};

export async function createProductSaleAndDistributeCommissions(
  saleData: Omit<ProductSale, 'id' | 'saleDate' | 'shopManagerName'>,
  shopManager: User
): Promise<void> {
    const batch = writeBatch(db);
    const allUsers = await getAllUsers();

    // 1. Find the customer record by token serial
    const customerQuery = query(collection(db, "customers"), where("tokenSerial", "==", saleData.tokenSerial));
    const customerSnap = await getDocs(customerQuery);
    if (customerSnap.empty) {
        throw new Error(`No customer found with token: ${saleData.tokenSerial}`);
    }
    const customerDoc = customerSnap.docs[0];
    const customer = { ...customerDoc.data(), id: customerDoc.id } as Customer;

    // 2. Create the ProductSale document
    const newSaleRef = doc(collection(db, "productSales"));
    const saleDate = new Date().toISOString();
    const newSale: ProductSale = {
        ...saleData,
        id: newSaleRef.id,
        saleDate,
        shopManagerName: shopManager.name,
    };
    batch.set(newSaleRef, newSale);

    // 3. Get commission rates for this sale
    const commissionRates = getProductCommissionRates(newSale.price, newSale.paymentMethod);
    
    // 4. Find the original salesman and traverse the hierarchy
    const salesman = allUsers.find(u => u.id === customer.salesmanId);
    if (!salesman) {
        throw new Error(`Could not find the original salesman (ID: ${customer.salesmanId}) for this token.`);
    }

    let currentUser: User | undefined = salesman;
    while(currentUser) {
        const commission = commissionRates[currentUser.role as keyof typeof commissionRates] || 0;
        if (commission > 0) {
            const userRef = doc(db, "users", currentUser.id);
            batch.update(userRef, { totalIncome: increment(commission) });

            const incomeRecordRef = doc(collection(db, "incomeRecords"));
            const newIncomeRecord: IncomeRecord = {
                id: incomeRecordRef.id,
                userId: currentUser.id,
                amount: commission,
                saleDate: saleDate,
                grantedForRole: currentUser.role,
                salesmanId: salesman.id,
                salesmanName: salesman.name,
                sourceType: 'product_sale',
                customerId: customer.id,
                customerName: customer.name,
                productName: newSale.productName,
                productPrice: newSale.price,
                paymentMethod: newSale.paymentMethod,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }

        currentUser = currentUser.referrerId ? allUsers.find(u => u.id === currentUser!.referrerId) : undefined;
    }

    // 5. Handle Admin Team commission
    const adminCommission = commissionRates["Admin"];
    if (adminCommission > 0) {
        const adminUsers = allUsers.filter(u => u.role === 'Admin');
        for (const adminUser of adminUsers) {
            const userRef = doc(db, "users", adminUser.id);
            batch.update(userRef, { totalIncome: increment(adminCommission) });

            const incomeRecordRef = doc(collection(db, "incomeRecords"));
            const newIncomeRecord: IncomeRecord = {
                id: incomeRecordRef.id,
                userId: adminUser.id,
                amount: adminCommission,
                saleDate: saleDate,
                grantedForRole: 'Admin',
                salesmanId: salesman.id,
                salesmanName: salesman.name,
                sourceType: 'product_sale',
                customerId: customer.id,
                customerName: customer.name,
                productName: newSale.productName,
                productPrice: newSale.price,
                paymentMethod: newSale.paymentMethod,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
    }

    // 6. Commit the batch
    await batch.commit();
}


export async function updateUser(userId: string, data: { name: string; role: Role }): Promise<void> {
  const userDocRef = doc(db, "users", userId);
  await updateDoc(userDocRef, data);
}

export async function getIncomeRecordsForUser(userId: string): Promise<IncomeRecord[]> {
    const recordsCol = collection(db, "incomeRecords");
    const q = query(recordsCol, where("userId", "==", userId));
    const recordsSnap = await getDocs(q);
    const records = recordsSnap.docs.map(doc => doc.data() as IncomeRecord);
    return records.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
}

export async function resetAllIncomes(): Promise<void> {
  const batch = writeBatch(db);

  const incomeRecordsCol = collection(db, "incomeRecords");
  const incomeRecordsSnap = await getDocs(incomeRecordsCol);
  incomeRecordsSnap.docs.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
  });

  const usersCol = collection(db, "users");
  const usersSnap = await getDocs(usersCol);
  usersSnap.docs.forEach(userDoc => {
      batch.update(userDoc.ref, { totalIncome: 0 });
  });

  await batch.commit();
}
