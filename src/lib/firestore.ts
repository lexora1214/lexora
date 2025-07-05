import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, increment, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User, Role, Customer, CommissionSettings, IncomeRecord } from "@/types";
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

  if (role !== "Regional Director" && role !== "Admin") {
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
  let isCodeUnique = false;
  const usersCollection = collection(db, "users");

  if (role !== "Salesman") {
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
    return customersSnap.docs.map(doc => doc.data() as Customer);
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
    // Ensure all default fields are present by merging with defaults
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
        commissionDistributed: true,
    };
    batch.set(newCustomerRef, newCustomer);

    // Hierarchical commissions
    const commissionAmounts: Record<Role, number> = {
        "Salesman": settings.salesman,
        "Team Operation Manager": settings.teamOperationManager,
        "Group Operation Manager": settings.groupOperationManager,
        "Head Group Manager": settings.headGroupManager,
        "Regional Director": settings.regionalDirector,
        "Admin": 0, // Admins don't get commission from the direct sales hierarchy
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
                customerId: newCustomer.id,
                customerName: newCustomer.name,
                saleDate: saleDate,
                grantedForRole: currentUser.role,
                salesmanId: salesman.id,
                salesmanName: salesman.name,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
        
        if (currentUser.referrerId) {
            currentUser = allUsers.find(u => u.id === currentUser!.referrerId);
        } else {
            currentUser = undefined;
        }
    }

    // Admin team commission
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
                customerId: newCustomer.id,
                customerName: newCustomer.name,
                saleDate: saleDate,
                grantedForRole: 'Admin',
                salesmanId: salesman.id,
                salesmanName: salesman.name,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
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
    return recordsSnap.docs.map(doc => doc.data() as IncomeRecord).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
}
