import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, increment } from "firebase/firestore";
import { db } from "./firebase";
import { User, Role, Customer } from "@/types";
import type { User as FirebaseUser } from 'firebase/auth';

export async function createUserProfile(firebaseUser: FirebaseUser, name: string, role: Role, referralCode: string): Promise<User> {
  let referrerId: string | null = null;

  if (role !== "Regional Director") {
    if (!referralCode) {
      throw new Error("A referral code is required for this role.");
    }
    const referrerDocRef = doc(db, "users", referralCode);
    const referrerDocSnap = await getDoc(referrerDocRef);

    if (!referrerDocSnap.exists()) {
      throw new Error("Invalid referrer ID. Please check the code and try again.");
    }
    referrerId = referralCode;
  }


  const newUser: User = {
    id: firebaseUser.uid,
    name,
    email: firebaseUser.email!,
    role: role,
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


export async function createCustomer(customerData: Omit<Customer, 'id' | 'saleDate' | 'commissionDistributed' | 'salesmanId'>, salesman: User): Promise<void> {
    const batch = writeBatch(db);
    const allUsers = await getAllUsers();
    
    const newCustomerRef = doc(collection(db, "customers"));
    const newCustomer: Customer = {
        ...customerData,
        id: newCustomerRef.id,
        salesmanId: salesman.id,
        saleDate: new Date().toISOString(),
        commissionDistributed: true,
    };
    batch.set(newCustomerRef, newCustomer);

    const commissionAmounts: Record<Role, number> = {
        "Salesman": 600,
        "Team Operation Manager": 400,
        "Group Operation Manager": 250,
        "Head Group Manager": 150,
        "Regional Director": 100,
        "Admin": 0,
    };

    let currentUser: User | undefined = salesman;
    
    while(currentUser) {
        const commission = commissionAmounts[currentUser.role] || 0;
        if (commission > 0) {
            const userRef = doc(db, "users", currentUser.id);
            batch.update(userRef, { totalIncome: increment(commission) });
        }
        
        if (currentUser.referrerId) {
            currentUser = allUsers.find(u => u.id === currentUser!.referrerId);
        } else {
            currentUser = undefined;
        }
    }

    await batch.commit();
}
