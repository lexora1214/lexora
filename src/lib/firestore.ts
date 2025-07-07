import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, increment, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User, Role, Customer, CommissionSettings, IncomeRecord, ProductSale, ProductCommissionSettings, SignupRoleSettings, ProductCommissionTier } from "@/types";
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
        return { ...userDocSnap.data(), id: userDocSnap.id } as User;
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

export async function createCustomer(customerData: Omit<Customer, 'id' | 'saleDate' | 'commissionDistributed' | 'salesmanId' | 'tokenIsAvailable'>, salesman: User): Promise<void> {
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
        commissionDistributed: true,
        tokenIsAvailable: true,
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
                tokenSerial: newCustomer.tokenSerial,
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
                tokenSerial: newCustomer.tokenSerial,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
    }

    await batch.commit();
}


// --- Product Sale and Commission Logic ---

const DEFAULT_PRODUCT_COMMISSIONS: ProductCommissionSettings = {
    tiers: [
        { id: 'tier1', minPrice: 20000, maxPrice: 29999, commissions: { salesman: { cash: 1600, installments: 960 }, teamOperationManager: { cash: 1000, installments: 600 }, groupOperationManager: { cash: 400, installments: 240 }, headGroupManager: { cash: 250, installments: 150 }, regionalDirector: { cash: 250, installments: 150 }, admin: { cash: 1500, installments: 900 } } },
        { id: 'tier2', minPrice: 30000, maxPrice: 49999, commissions: { salesman: { cash: 1920, installments: 1280 }, teamOperationManager: { cash: 1200, installments: 800 }, groupOperationManager: { cash: 480, installments: 320 }, headGroupManager: { cash: 300, installments: 200 }, regionalDirector: { cash: 300, installments: 200 }, admin: { cash: 1800, installments: 1200 } } },
        { id: 'tier3', minPrice: 50000, maxPrice: 74999, commissions: { salesman: { cash: 2560, installments: 1600 }, teamOperationManager: { cash: 1600, installments: 1000 }, groupOperationManager: { cash: 640, installments: 400 }, headGroupManager: { cash: 400, installments: 250 }, regionalDirector: { cash: 400, installments: 250 }, admin: { cash: 2400, installments: 1500 } } },
        { id: 'tier4', minPrice: 75000, maxPrice: 99999, commissions: { salesman: { cash: 3200, installments: 2240 }, teamOperationManager: { cash: 2000, installments: 1400 }, groupOperationManager: { cash: 800, installments: 560 }, headGroupManager: { cash: 500, installments: 350 }, regionalDirector: { cash: 500, installments: 350 }, admin: { cash: 3000, installments: 2100 } } },
        { id: 'tier5', minPrice: 100000, maxPrice: 249999, commissions: { salesman: { cash: 3520, installments: 2560 }, teamOperationManager: { cash: 2200, installments: 1600 }, groupOperationManager: { cash: 880, installments: 640 }, headGroupManager: { cash: 550, installments: 400 }, regionalDirector: { cash: 550, installments: 400 }, admin: { cash: 3300, installments: 2400 } } },
        { id: 'tier6', minPrice: 250000, maxPrice: null, commissions: { salesman: { cash: 4480, installments: 3520 }, teamOperationManager: { cash: 2800, installments: 2200 }, groupOperationManager: { cash: 1120, installments: 880 }, headGroupManager: { cash: 700, installments: 550 }, regionalDirector: { cash: 700, installments: 550 }, admin: { cash: 4200, installments: 3300 } } },
    ]
};

export async function getProductCommissionSettings(): Promise<ProductCommissionSettings> {
    const settingsDocRef = doc(db, "settings", "productCommissions");
    const settingsDocSnap = await getDoc(settingsDocRef);
    if (settingsDocSnap.exists()) {
        return settingsDocSnap.data() as ProductCommissionSettings;
    }
    await setDoc(settingsDocRef, DEFAULT_PRODUCT_COMMISSIONS);
    return DEFAULT_PRODUCT_COMMISSIONS;
}

export async function updateProductCommissionSettings(data: ProductCommissionSettings): Promise<void> {
    const settingsDocRef = doc(db, "settings", "productCommissions");
    await setDoc(settingsDocRef, data);
}

export async function createProductSaleAndDistributeCommissions(
  saleData: Omit<ProductSale, 'id' | 'saleDate' | 'shopManagerName'>,
  shopManager: User
): Promise<void> {
    const batch = writeBatch(db);
    const allUsers = await getAllUsers();

    const customerQuery = query(collection(db, "customers"), where("tokenSerial", "==", saleData.tokenSerial));
    const customerSnap = await getDocs(customerQuery);
    if (customerSnap.empty) {
        throw new Error(`No customer found with token: ${saleData.tokenSerial}`);
    }
    const customerDoc = customerSnap.docs[0];
    const customer = { ...customerDoc.data(), id: customerDoc.id } as Customer;

    if (!customer.tokenIsAvailable) {
        throw new Error(`Token ${saleData.tokenSerial} has already been used to purchase a product.`);
    }

    const newSaleRef = doc(collection(db, "productSales"));
    const saleDate = new Date().toISOString();
    const newSale: ProductSale = {
        ...saleData,
        id: newSaleRef.id,
        saleDate,
        shopManagerName: shopManager.name,
    };
    batch.set(newSaleRef, newSale);

    const customerRef = doc(db, "customers", customer.id);
    batch.update(customerRef, { tokenIsAvailable: false });

    const salesman = allUsers.find(u => u.id === customer.salesmanId);
    if (!salesman) {
        throw new Error(`Could not find the original salesman (ID: ${customer.salesmanId}) for this token.`);
    }

    let applicableTier: ProductCommissionTier | undefined;
    // Only look for tiers if price is >= 20000, otherwise commissions are 0.
    if (newSale.price >= 20000) {
        const productSettings = await getProductCommissionSettings();
        applicableTier = productSettings.tiers.find(tier => 
            newSale.price >= tier.minPrice && (tier.maxPrice === null || newSale.price <= tier.maxPrice)
        );
    }
    
    // This loop handles both commission and zero-commission scenarios.
    let currentUser: User | undefined = salesman;
    while(currentUser) {
        let commission = 0;
        if (applicableTier) {
            const roleKey = currentUser.role.replace(/\s/g, '').charAt(0).toLowerCase() + currentUser.role.replace(/\s/g, '').slice(1) as keyof typeof applicableTier.commissions;
            
            const tierCommissions = applicableTier.commissions[roleKey];

            if (tierCommissions) {
                commission = tierCommissions[newSale.paymentMethod];
            }
        }
        
        // Always create an income record.
        const incomeRecordRef = doc(collection(db, "incomeRecords"));
        const newIncomeRecord: IncomeRecord = {
            id: incomeRecordRef.id,
            userId: currentUser.id,
            amount: commission,
            saleDate: saleDate,
            grantedForRole: currentUser.role,
            salesmanId: salesman.id,
            salesmanName: salesman.name,
            shopManagerName: shopManager.name,
            sourceType: 'product_sale',
            customerId: customer.id,
            customerName: customer.name,
            tokenSerial: newSale.tokenSerial,
            productName: newSale.productName,
            productPrice: newSale.price,
            paymentMethod: newSale.paymentMethod,
        };
        batch.set(incomeRecordRef, newIncomeRecord);

        // Only update total income if commission is greater than 0.
        if (commission > 0) {
            const userRef = doc(db, "users", currentUser.id);
            batch.update(userRef, { totalIncome: increment(commission) });
        }

        currentUser = currentUser.referrerId ? allUsers.find(u => u.id === currentUser!.referrerId) : undefined;
    }

    // Handle Admin commission
    let adminCommission = 0;
    if (applicableTier?.commissions.admin) {
        adminCommission = applicableTier.commissions.admin[newSale.paymentMethod];
    }
    
    const adminUsers = allUsers.filter(u => u.role === 'Admin');
    for (const adminUser of adminUsers) {
        // Always create an income record for admins.
        const incomeRecordRef = doc(collection(db, "incomeRecords"));
        const newIncomeRecord: IncomeRecord = {
            id: incomeRecordRef.id,
            userId: adminUser.id,
            amount: adminCommission,
            saleDate: saleDate,
            grantedForRole: 'Admin',
            salesmanId: salesman.id,
            salesmanName: salesman.name,
            shopManagerName: shopManager.name,
            sourceType: 'product_sale',
            customerId: customer.id,
            customerName: customer.name,
            tokenSerial: newSale.tokenSerial,
            productName: newSale.productName,
            productPrice: newSale.price,
            paymentMethod: newSale.paymentMethod,
        };
        batch.set(incomeRecordRef, newIncomeRecord);
        
        // Only update total income if commission is greater than 0.
        if (adminCommission > 0) {
            const userRef = doc(db, "users", adminUser.id);
            batch.update(userRef, { totalIncome: increment(adminCommission) });
        }
    }

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

// --- Signup Role Settings ---

const DEFAULT_SIGNUP_ROLE_SETTINGS: SignupRoleSettings = {
  visibleRoles: {
    "Admin": true,
    "Shop Manager": true,
    "Regional Director": true,
    "Head Group Manager": true,
    "Group Operation Manager": true,
    "Team Operation Manager": true,
    "Salesman": true,
  }
};

export async function getSignupRoleSettings(): Promise<SignupRoleSettings> {
  const settingsDocRef = doc(db, "settings", "signupRoles");
  const settingsDocSnap = await getDoc(settingsDocRef);
  if (settingsDocSnap.exists()) {
    const savedSettings = settingsDocSnap.data() as SignupRoleSettings;
    // Merge with defaults to ensure all roles are present, even if added later
    return {
        visibleRoles: {
            ...DEFAULT_SIGNUP_ROLE_SETTINGS.visibleRoles,
            ...savedSettings.visibleRoles
        }
    };
  }
  await setDoc(settingsDocRef, DEFAULT_SIGNUP_ROLE_SETTINGS);
  return DEFAULT_SIGNUP_ROLE_SETTINGS;
}

export async function updateSignupRoleSettings(data: SignupRoleSettings): Promise<void> {
  const settingsDocRef = doc(db, "settings", "signupRoles");
  await setDoc(settingsDocRef, data);
}
