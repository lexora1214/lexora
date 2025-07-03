import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, increment } from "firebase/firestore";
import { db } from "./firebase";
import { User, Role, Customer } from "@/types";
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

  if (role !== "Regional Director") {
    if (!referralCodeInput || referralCodeInput.length !== 6) {
      throw new Error("A valid 6-character referral code is required for this role.");
    }
    const usersRef = collection(db, "users");
    // Note: Firestore queries are case-sensitive. We query for the uppercase code.
    const q = query(usersRef, where("referralCode", "==", referralCodeInput));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Invalid referrer code. Please check the code and try again.");
    }
    
    const referrerDoc = querySnapshot.docs[0];
    referrerId = referrerDoc.id;
  }
  
  // Generate a unique referral code for the new user
  let newReferralCode = '';
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
