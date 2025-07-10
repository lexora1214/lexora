import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, increment, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { User, Role, Customer, CommissionSettings, IncomeRecord, ProductSale, ProductCommissionSettings, SignupRoleSettings, CommissionRequest, SalesmanStage, SalarySettings, MonthlySalaryPayout } from "@/types";
import type { User as FirebaseUser } from 'firebase/auth';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createUserProfile(firebaseUser: FirebaseUser, name: string, mobileNumber: string, role: Role, referralCodeInput: string, branch?: string, salesmanStage?: SalesmanStage): Promise<User> {
  let referrerId: string | null = null;
  const isReferralNeeded = role && !['Regional Director', 'Admin'].includes(role);

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
  const isReferralCodeNeeded = role && !['Salesman', 'Delivery Boy', 'Recovery Officer'].includes(role);
  
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
    mobileNumber,
    role: role,
    referralCode: newReferralCode,
    referrerId: referrerId,
    totalIncome: 0,
    avatar: `https://placehold.co/100x100.png`,
    createdAt: new Date().toISOString(),
    ...(role === 'Team Operation Manager' && { branch }),
    ...(role === 'Salesman' && { salesmanStage }),
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

export async function createCustomer(customerData: Omit<Customer, 'id' | 'saleDate' | 'commissionStatus' | 'salesmanId' | 'tokenIsAvailable'>, salesman: User): Promise<void> {
    const batch = writeBatch(db);
    
    const newCustomerRef = doc(collection(db, "customers"));
    const saleDate = new Date().toISOString();
    const newCustomer: Customer = {
        ...customerData,
        id: newCustomerRef.id,
        salesmanId: salesman.id,
        saleDate: saleDate,
        commissionStatus: 'pending',
        tokenIsAvailable: true,
        branch: salesman.branch,
    };
    batch.set(newCustomerRef, newCustomer);

    const commissionRequestRef = doc(collection(db, "commissionRequests"));
    const newRequest: CommissionRequest = {
        id: commissionRequestRef.id,
        customerId: newCustomer.id,
        customerName: newCustomer.name,
        salesmanId: salesman.id,
        salesmanName: salesman.name,
        tokenSerial: newCustomer.tokenSerial,
        requestDate: saleDate,
        status: 'pending',
    };
    batch.set(commissionRequestRef, newRequest);

    await batch.commit();
}


export async function approveTokenCommission(requestId: string, admin: User): Promise<void> {
    const batch = writeBatch(db);
    const requestRef = doc(db, "commissionRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
        throw new Error("Commission request is not valid or has already been processed.");
    }
    
    if (!requestSnap.data().depositSlipUrl) {
        throw new Error("A deposit slip must be uploaded before approving.");
    }

    const request = requestSnap.data() as CommissionRequest;
    const customerRef = doc(db, "customers", request.customerId);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) {
        throw new Error("Associated customer not found.");
    }

    const allUsers = await getAllUsers();
    const settings = await getCommissionSettings();
    const salesman = allUsers.find(u => u.id === request.salesmanId);

    if (!salesman) {
        throw new Error("Original salesman not found.");
    }
    
    const processedDate = new Date().toISOString();

    const commissionAmounts: Record<string, number> = {
        "Salesman": settings.salesman,
        "Team Operation Manager": settings.teamOperationManager,
        "Group Operation Manager": settings.groupOperationManager,
        "Head Group Manager": settings.headGroupManager,
        "Regional Director": settings.regionalDirector,
        "Admin": 0,
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
                saleDate: processedDate,
                grantedForRole: currentUser.role,
                salesmanId: salesman.id,
                salesmanName: salesman.name,
                sourceType: 'token_sale',
                customerId: request.customerId,
                customerName: request.customerName,
                tokenSerial: request.tokenSerial,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
        
        currentUser = currentUser.referrerId ? allUsers.find(u => u.id === currentUser!.referrerId) : undefined;
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
                saleDate: processedDate,
                grantedForRole: 'Admin',
                salesmanId: salesman.id,
                salesmanName: salesman.name,
                sourceType: 'token_sale',
                customerId: request.customerId,
                customerName: request.customerName,
                tokenSerial: request.tokenSerial,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
    }

    batch.update(requestRef, {
        status: 'approved',
        approverId: admin.id,
        approverName: admin.name,
        processedDate: processedDate,
    });
    batch.update(customerRef, { commissionStatus: 'approved' });

    await batch.commit();
}


export async function rejectTokenCommission(requestId: string, admin: User): Promise<void> {
    const batch = writeBatch(db);
    const requestRef = doc(db, "commissionRequests", requestId);
    const requestSnap = await getDoc(requestRef);
     if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
        throw new Error("Commission request is not valid or has already been processed.");
    }
    const request = requestSnap.data() as CommissionRequest;
    const customerRef = doc(db, "customers", request.customerId);
    
    const processedDate = new Date().toISOString();

    batch.update(requestRef, {
        status: 'rejected',
        approverId: admin.id,
        approverName: admin.name,
        processedDate: processedDate,
    });
    batch.update(customerRef, { commissionStatus: 'rejected' });
    
    await batch.commit();
}

export async function uploadDepositSlipAndUpdateRequest(requestId: string, file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
        throw new Error("File must be an image.");
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("You must be logged in to upload a file.");
    }
    
    const requestRef = doc(db, "commissionRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
        throw new Error("The commission request could not be found.");
    }

    const requestData = requestSnap.data();
    if (requestData.salesmanId !== currentUser.uid) {
        throw new Error("You are not authorized to upload a slip for this sale.");
    }
    
    const metadata = {
        customMetadata: {
            uploaderUid: currentUser.uid,
            requestId: requestId,
        }
    };

    const storageRef = ref(storage, `deposit_slips/${requestId}/${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    await updateDoc(requestRef, {
        depositSlipUrl: downloadURL,
    });
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
  formData: {
    productName: string;
    productCode?: string;
    totalValue: number;
    discountValue?: number | null;
    downPayment?: number | null;
    installments?: number | null;
    monthlyInstallment?: number | null;
    paymentMethod: 'cash' | 'installments';
    customerToken: string;
  },
  shopManager: User,
  customerId: string,
  customerName: string
): Promise<void> {
    const batch = writeBatch(db);
    const allUsers = await getAllUsers();

    const customerDocRef = doc(db, "customers", customerId);
    const customerDoc = await getDoc(customerDocRef);
    if (!customerDoc.exists()) {
        throw new Error(`No customer found with token: ${formData.customerToken}`);
    }
    const customer = { ...customerDoc.data(), id: customerDoc.id } as Customer;

    if (!customer.tokenIsAvailable) {
        throw new Error(`Token ${formData.customerToken} has already been used to purchase a product.`);
    }

    batch.update(customerDocRef, {
      tokenIsAvailable: false,
      purchasingItem: formData.productName,
      purchasingItemCode: formData.productCode ?? null,
      totalValue: formData.totalValue,
      discountValue: formData.discountValue ?? null,
      downPayment: formData.downPayment ?? null,
      installments: formData.installments ?? null,
      monthlyInstallment: formData.monthlyInstallment ?? null,
    });

    const newSaleRef = doc(collection(db, "productSales"));
    const saleDate = new Date().toISOString();
    
    const newSale: ProductSale = {
        id: newSaleRef.id,
        productName: formData.productName,
        productCode: formData.productCode,
        price: formData.totalValue,
        paymentMethod: formData.paymentMethod,
        customerId: customerId,
        customerName: customerName,
        tokenSerial: formData.customerToken,
        saleDate,
        shopManagerId: shopManager.id,
        shopManagerName: shopManager.name,
        deliveryStatus: 'pending',
    };

    if (formData.paymentMethod === 'installments') {
        newSale.installments = formData.installments ?? undefined;
        newSale.monthlyInstallment = formData.monthlyInstallment ?? undefined;
        newSale.paidInstallments = 0;
        newSale.recoveryStatus = 'pending';
    }

    batch.set(newSaleRef, newSale);

    if (formData.paymentMethod === 'cash') {
        const salesman = allUsers.find(u => u.id === customer.salesmanId);
        if (!salesman) {
            throw new Error(`Could not find the original salesman (ID: ${customer.salesmanId}) for this token.`);
        }

        const productSettings = await getProductCommissionSettings();
        const applicableTier = productSettings.tiers.find(tier => 
            newSale.price >= tier.minPrice && (tier.maxPrice === null || newSale.price <= tier.maxPrice)
        );
        
        if (applicableTier) {
            let currentUser: User | undefined = salesman;
            while(currentUser) {
                const roleKey = currentUser.role.replace(/\s/g, '').charAt(0).toLowerCase() + currentUser.role.replace(/\s/g, '').slice(1) as keyof typeof applicableTier.commissions;
                const tierCommissions = applicableTier.commissions[roleKey];
                
                if (tierCommissions) {
                    const commission = tierCommissions.cash;
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
                    }
                }
                currentUser = currentUser.referrerId ? allUsers.find(u => u.id === currentUser!.referrerId) : undefined;
            }

            const adminCommissionInfo = applicableTier.commissions.admin;
            if (adminCommissionInfo) {
                const adminCommission = adminCommissionInfo.cash;
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
                    }
                }
            }
        }
    }

    await batch.commit();
}


export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
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
    "Regional Director": true,
    "Head Group Manager": true,
    "Group Operation Manager": true,
    "Team Operation Manager": true,
    "Salesman": true,
    "Delivery Boy": true,
    "Recovery Officer": true,
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

// --- Delivery Management ---

export async function assignDelivery(productSaleId: string, deliveryBoyId: string, deliveryBoyName: string): Promise<void> {
  const saleDocRef = doc(db, "productSales", productSaleId);
  await updateDoc(saleDocRef, {
    deliveryStatus: 'assigned',
    assignedTo: deliveryBoyId,
    assignedToName: deliveryBoyName,
    assignedAt: new Date().toISOString(),
  });
}

export async function markAsDelivered(productSaleId: string): Promise<void> {
  const saleDocRef = doc(db, "productSales", productSaleId);
  await updateDoc(saleDocRef, {
    deliveryStatus: 'delivered',
    deliveredAt: new Date().toISOString(),
  });
}

// --- Recovery Management ---

export async function assignRecovery(productSaleId: string, recoveryOfficerId: string, recoveryOfficerName: string): Promise<void> {
  const saleDocRef = doc(db, "productSales", productSaleId);
  await updateDoc(saleDocRef, {
    recoveryStatus: 'assigned',
    recoveryOfficerId: recoveryOfficerId,
    recoveryOfficerName: recoveryOfficerName,
  });
}

export async function markInstallmentPaid(productSaleId: string): Promise<void> {
  const batch = writeBatch(db);
  const saleDocRef = doc(db, "productSales", productSaleId);
  const saleDocSnap = await getDoc(saleDocRef);

  if (!saleDocSnap.exists()) {
    throw new Error("Product sale not found.");
  }

  const saleData = saleDocSnap.data() as ProductSale;

  if (saleData.paymentMethod !== 'installments' || !saleData.installments || saleData.paidInstallments === undefined) {
    throw new Error("This sale is not an installment plan.");
  }

  if (saleData.paidInstallments >= saleData.installments) {
    throw new Error("All installments have already been paid.");
  }
  
  const nextInstallmentNumber = saleData.paidInstallments + 1;

  // 1. Update the sale document
  batch.update(saleDocRef, { paidInstallments: increment(1) });
  
  // 2. Distribute commissions for this installment
  const customerDocRef = doc(db, "customers", saleData.customerId);
  const customerDocSnap = await getDoc(customerDocRef);
  if (!customerDocSnap.exists()) {
    throw new Error("Could not find the customer for this sale.");
  }
  const customer = customerDocSnap.data() as Customer;
  
  const allUsers = await getAllUsers();
  const salesman = allUsers.find(u => u.id === customer.salesmanId);
  if (!salesman) {
    throw new Error("Could not find the salesman for this sale.");
  }

  const productSettings = await getProductCommissionSettings();
  const applicableTier = productSettings.tiers.find(tier => 
      saleData.price >= tier.minPrice && (tier.maxPrice === null || saleData.price <= tier.maxPrice)
  );
  
  const paymentDate = new Date().toISOString();

  if (applicableTier) {
    let currentUser: User | undefined = salesman;
    while(currentUser) {
      const roleKey = currentUser.role.replace(/\s/g, '').charAt(0).toLowerCase() + currentUser.role.replace(/\s/g, '').slice(1) as keyof typeof applicableTier.commissions;
      const tierCommissions = applicableTier.commissions[roleKey];
      
      if (tierCommissions && saleData.installments) {
        const perInstallmentCommission = tierCommissions.installments / saleData.installments;
        
        if (perInstallmentCommission > 0) {
            // Update user's total income
            const userRef = doc(db, "users", currentUser.id);
            batch.update(userRef, { totalIncome: increment(perInstallmentCommission) });
            
            // Create income record
            const incomeRecordRef = doc(collection(db, "incomeRecords"));
            const newIncomeRecord: IncomeRecord = {
              id: incomeRecordRef.id,
              userId: currentUser.id,
              amount: perInstallmentCommission,
              saleDate: paymentDate, // Date of payment, not original sale
              grantedForRole: currentUser.role,
              salesmanId: salesman.id,
              salesmanName: salesman.name,
              shopManagerName: saleData.shopManagerName,
              sourceType: 'product_sale',
              customerId: saleData.customerId,
              customerName: saleData.customerName,
              tokenSerial: saleData.tokenSerial,
              productName: saleData.productName,
              productPrice: saleData.price,
              paymentMethod: saleData.paymentMethod,
              installmentNumber: nextInstallmentNumber,
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
      }
      
      currentUser = currentUser.referrerId ? allUsers.find(u => u.id === currentUser!.referrerId) : undefined;
    }

    // Admin commission
    const adminCommissionInfo = applicableTier.commissions.admin;
    if (adminCommissionInfo && saleData.installments) {
      const perInstallmentAdminCommission = adminCommissionInfo.installments / saleData.installments;
      if (perInstallmentAdminCommission > 0) {
        const adminUsers = allUsers.filter(u => u.role === 'Admin');
        for (const adminUser of adminUsers) {
          const userRef = doc(db, "users", adminUser.id);
          batch.update(userRef, { totalIncome: increment(perInstallmentAdminCommission) });

          const incomeRecordRef = doc(collection(db, "incomeRecords"));
          const newIncomeRecord: IncomeRecord = {
            id: incomeRecordRef.id,
            userId: adminUser.id,
            amount: perInstallmentAdminCommission,
            saleDate: paymentDate,
            grantedForRole: 'Admin',
            salesmanId: salesman.id,
            salesmanName: salesman.name,
            shopManagerName: saleData.shopManagerName,
            sourceType: 'product_sale',
            customerId: saleData.customerId,
            customerName: saleData.customerName,
            tokenSerial: saleData.tokenSerial,
            productName: saleData.productName,
            productPrice: saleData.price,
            paymentMethod: saleData.paymentMethod,
            installmentNumber: nextInstallmentNumber,
          };
          batch.set(incomeRecordRef, newIncomeRecord);
        }
      }
    }
  }

  await batch.commit();
}


// --- Salary Management ---

const DEFAULT_SALARY_SETTINGS: SalarySettings = {
    "BUSINESS PROMOTER (stage 01)": 21000,
    "MARKETING EXECUTIVE (stage 02)": 30000,
    "Team Operation Manager": 40000,
    "Group Operation Manager": 45000,
    "Head Group Manager": 55000,
};

export async function getSalarySettings(): Promise<SalarySettings> {
    const settingsDocRef = doc(db, "settings", "salaries");
    const settingsDocSnap = await getDoc(settingsDocRef);
    if (settingsDocSnap.exists()) {
        return { ...DEFAULT_SALARY_SETTINGS, ...settingsDocSnap.data() };
    }
    await setDoc(settingsDocRef, DEFAULT_SALARY_SETTINGS);
    return DEFAULT_SALARY_SETTINGS;
}

export async function updateSalarySettings(data: SalarySettings): Promise<void> {
    const settingsDocRef = doc(db, "settings", "salaries");
    await setDoc(settingsDocRef, data, { merge: true });
}

export async function processMonthlySalaries(adminUser: User): Promise<{ usersPaid: number; totalAmount: number; }> {
    const now = new Date();
    // Make ID unique for every payout by including the timestamp
    const payoutId = `${now.toISOString()}`;

    const allUsers = await getAllUsers();
    const salarySettings = await getSalarySettings();
    const batch = writeBatch(db);

    let usersPaid = 0;
    let totalAmount = 0;
    const payoutDate = now.toISOString();

    for (const user of allUsers) {
        let salaryAmount = 0;
        let roleOrStage: keyof SalarySettings | undefined;

        if (user.role === 'Salesman' && user.salesmanStage) {
            roleOrStage = user.salesmanStage;
        } else if (Object.keys(DEFAULT_SALARY_SETTINGS).includes(user.role)) {
            roleOrStage = user.role as keyof SalarySettings;
        }

        if (roleOrStage) {
            salaryAmount = salarySettings[roleOrStage] ?? 0;
        }

        if (salaryAmount > 0) {
            usersPaid++;
            totalAmount += salaryAmount;

            const userRef = doc(db, "users", user.id);
            batch.update(userRef, { totalIncome: increment(salaryAmount) });

            const incomeRecordRef = doc(collection(db, "incomeRecords"));
            const newIncomeRecord: IncomeRecord = {
                id: incomeRecordRef.id,
                userId: user.id,
                amount: salaryAmount,
                saleDate: payoutDate,
                grantedForRole: user.role,
                salesmanId: user.id,
                salesmanName: user.name,
                sourceType: 'salary',
                payoutId: payoutId, // Tag the income record with the payout ID
            };
            batch.set(incomeRecordRef, newIncomeRecord);
        }
    }
    
    if (usersPaid === 0) {
        throw new Error("No users were eligible for a salary payment.");
    }

    const payoutDocRef = doc(db, "salaryPayouts", payoutId);
    const newPayoutRecord: MonthlySalaryPayout = {
        id: payoutId,
        payoutDate,
        processedBy: adminUser.id,
        totalUsersPaid: usersPaid,
        totalAmountPaid: totalAmount,
    };
    batch.set(payoutDocRef, newPayoutRecord);

    await batch.commit();
    
    return { usersPaid, totalAmount };
}

export async function getSalaryPayouts(): Promise<MonthlySalaryPayout[]> {
    const payoutsCol = collection(db, "salaryPayouts");
    const q = query(payoutsCol);
    const payoutsSnap = await getDocs(q);
    const payouts = payoutsSnap.docs.map(doc => doc.data() as MonthlySalaryPayout);
    return payouts.sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime());
}

export async function reverseSalaryPayout(payoutId: string): Promise<void> {
    const batch = writeBatch(db);
    const payoutDocRef = doc(db, "salaryPayouts", payoutId);
    
    const incomeQuery = query(collection(db, "incomeRecords"), where("payoutId", "==", payoutId));
    const incomeRecordsSnap = await getDocs(incomeQuery);
    
    if (incomeRecordsSnap.empty) {
        // If no records found, maybe it was already reversed. Just delete the log.
        await deleteDoc(payoutDocRef);
        return;
    }

    for (const recordDoc of incomeRecordsSnap.docs) {
        const record = recordDoc.data() as IncomeRecord;
        
        // Decrement user's total income
        const userRef = doc(db, "users", record.userId);
        batch.update(userRef, { totalIncome: increment(-record.amount) });
        
        // Delete the income record
        batch.delete(recordDoc.ref);
    }
    
    // Delete the original payout log
    batch.delete(payoutDocRef);
    
    await batch.commit();
}
