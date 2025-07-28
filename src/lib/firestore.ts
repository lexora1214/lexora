

import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, increment, updateDoc, deleteDoc, addDoc, runTransaction, deleteField } from "firebase/firestore";
import { getAuth, updatePassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { User, Role, Customer, CommissionSettings, IncomeRecord, ProductSale, ProductCommissionSettings, SignupRoleSettings, CommissionRequest, SalesmanStage, SalarySettings, MonthlySalaryPayout, StockItem, IncentiveSettings, Reminder, SalesmanDocuments, SalaryChangeRequest } from "@/types";
import type { User as FirebaseUser } from 'firebase/auth';
import { sendTokenSms, sendOtpSms as sendSmsForOtp } from "./sms";
import { getDownlineIdsAndUsers } from "./hierarchy";

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function uploadVerificationDocument(userId: string, file: File, documentType: string): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    const storageRef = ref(storage, `user-documents/${userId}/${documentType}.${fileExtension}`);
    const uploadResult = await uploadBytes(storageRef, file);
    return getDownloadURL(uploadResult.ref);
}

export async function createUserProfile(
    firebaseUser: FirebaseUser, 
    name: string, 
    mobileNumber: string, 
    role: Role, 
    referralCodeInput: string, 
    branch?: string, 
    salesmanStage?: SalesmanStage, 
    documents?: SalesmanDocuments,
    extraData?: Partial<User>
): Promise<User> {
  const batch = writeBatch(db);
  let referrerId: string | null = null;
  const isReferralNeeded = role && !['Regional Director', 'Admin', 'Super Admin'].includes(role);

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
  const isReferralCodeNeeded = role && !['Salesman', 'Delivery Boy', 'Recovery Officer', 'Branch Admin'].includes(role);
  
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

  const documentUrls: Partial<User> = {};
  if (role === 'Salesman' && documents) {
      documentUrls.nicFrontUrl = await uploadVerificationDocument(firebaseUser.uid, documents.nicFront, 'nic_front');
      documentUrls.nicBackUrl = await uploadVerificationDocument(firebaseUser.uid, documents.nicBack, 'nic_back');
      documentUrls.gsCertificateUrl = await uploadVerificationDocument(firebaseUser.uid, documents.gsCertificate, 'gs_certificate');
      documentUrls.policeReportUrl = await uploadVerificationDocument(firebaseUser.uid, documents.policeReport, 'police_report');
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
    avatar: ``,
    createdAt: new Date().toISOString(),
    isDisabled: true, // New users are disabled by default
    ...(branch && { branch }),
    ...(role === 'Salesman' && { salesmanStage }),
    ...documentUrls,
    ...extraData,
  };

  const userDocRef = doc(db, "users", firebaseUser.uid);
  batch.set(userDocRef, newUser);
  
  await batch.commit();

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
    await updateDoc(settingsDocRef, data);
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
        downPayment: customerData.downPayment ?? null,
        installments: customerData.paymentMethod === 'cash' ? null : (customerData.installments ?? null),
        monthlyInstallment: customerData.paymentMethod === 'cash' ? null : (customerData.monthlyInstallment ?? null),
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

    // Send SMS after successful database commit
    await sendTokenSms({
        customerName: newCustomer.name,
        customerContact: newCustomer.contactInfo,
        tokenSerial: newCustomer.tokenSerial,
        downPayment: newCustomer.downPayment,
        salesmanName: salesman.name,
        saleDate: newCustomer.saleDate,
    });
}


export async function approveTokenCommission(requestId: string, admin: User): Promise<void> {
    const batch = writeBatch(db);
    const requestRef = doc(db, "commissionRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
        throw new Error("Commission request is not valid or has already been processed.");
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
        const adminUsers = allUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin');
        for (const adminUser of adminUsers) {
            const userRef = doc(db, "users", adminUser.id);
            batch.update(userRef, { totalIncome: increment(adminCommission) });

            const incomeRecordRef = doc(collection(db, "incomeRecords"));
            const newIncomeRecord: IncomeRecord = {
                id: incomeRecordRef.id,
                userId: adminUser.id,
                amount: adminCommission,
                saleDate: processedDate,
                grantedForRole: adminUser.role,
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

export async function uploadDepositSlipForGroup(requestIds: string[], file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
        throw new Error("File must be an image.");
    }
    if (requestIds.length === 0) {
        throw new Error("No requests selected.");
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("You must be logged in to upload a file.");
    }

    const firstRequestRef = doc(db, "commissionRequests", requestIds[0]);
    const firstRequestSnap = await getDoc(firstRequestRef);
    if (!firstRequestSnap.exists()) {
        throw new Error("The first commission request could not be found.");
    }
    if (firstRequestSnap.data().salesmanId !== currentUser.uid) {
        throw new Error("You are not authorized to upload a slip for this sale.");
    }

    const slipGroupId = doc(collection(db, "dummy")).id; // Generate a unique ID for the group
    const storageRef = ref(storage, `deposit_slips/group_${slipGroupId}/${file.name}`);
    
    const metadata = {
        customMetadata: {
            uploaderUid: currentUser.uid,
            slipGroupId: slipGroupId,
        }
    };

    const uploadResult = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    const batch = writeBatch(db);
    for (const requestId of requestIds) {
        const requestRef = doc(db, "commissionRequests", requestId);
        batch.update(requestRef, {
            depositSlipUrl: downloadURL,
            slipGroupId: slipGroupId,
        });
    }

    await batch.commit();
}

export async function approveGroupedCommissions(slipGroupId: string, admin: User): Promise<void> {
    const q = query(collection(db, "commissionRequests"), where("slipGroupId", "==", slipGroupId), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        throw new Error("No pending requests found for this group.");
    }

    for (const doc of querySnapshot.docs) {
        // We call the individual approval function but don't await it inside the loop
        // to avoid race conditions with a single batch. A better approach is a transaction
        // or a batched read then batched write, which is what approveTokenCommission does.
        // For simplicity, we'll just call it and it will create its own batch.
        // In a high-throughput system, this should be refactored to use a single large batch.
        await approveTokenCommission(doc.id, admin);
    }
}

export async function rejectGroupedCommissions(slipGroupId: string, admin: User): Promise<void> {
    const q = query(collection(db, "commissionRequests"), where("slipGroupId", "==", slipGroupId), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        throw new Error("No pending requests found for this group.");
    }

    for (const doc of querySnapshot.docs) {
        await rejectTokenCommission(doc.id, admin);
    }
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
    productId: string;
    productName: string;
    productCode?: string;
    totalValue: number;
    discountValue?: number | null;
    downPayment?: number | null;
    installments?: number | null;
    monthlyInstallment?: number | null;
    paymentMethod: 'cash' | 'installments';
    customerToken: string;
    requestedDeliveryDate?: Date;
  },
  shopManager: User,
  customerId: string,
  customerName: string
): Promise<void> {

    await runTransaction(db, async (transaction) => {
        // --- ALL READS MUST HAPPEN FIRST ---
        const allUsers = await getAllUsers();

        // READ 1: Stock Item
        const stockItemRef = doc(db, "stock", formData.productId);
        const stockItemDoc = await transaction.get(stockItemRef);
        
        // READ 2: Customer
        const customerDocRef = doc(db, "customers", customerId);
        const customerDoc = await transaction.get(customerDocRef);
        
        // READ 3: Commission Settings
        const productSettings = await getProductCommissionSettings();

        // --- VALIDATION AND DATA PREP ---
        if (!stockItemDoc.exists() || stockItemDoc.data().quantity < 1) {
            throw new Error("This product is out of stock.");
        }
        if (!customerDoc.exists()) {
            throw new Error(`No customer found with token: ${formData.customerToken}`);
        }
        const customer = { ...customerDoc.data(), id: customerDoc.id } as Customer;

        const newSaleRef = doc(collection(db, "productSales"));
        const saleDate = new Date().toISOString();
        
        // Create a mutable copy of formData to clean it before creating the final object
        const cleanFormData: Partial<ProductSale> = {
            id: newSaleRef.id,
            productId: formData.productId,
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
            cleanFormData.installments = formData.installments ?? null;
            cleanFormData.monthlyInstallment = formData.monthlyInstallment ?? null;
            cleanFormData.paidInstallments = 0;
            cleanFormData.recoveryStatus = 'pending';
        } else {
            // Ensure installment fields are not set for cash sales
            cleanFormData.installments = undefined;
            cleanFormData.monthlyInstallment = undefined;
            cleanFormData.paidInstallments = undefined;
            cleanFormData.recoveryStatus = undefined;
        }

        if (formData.requestedDeliveryDate) {
            cleanFormData.requestedDeliveryDate = formData.requestedDeliveryDate.toISOString();
        }
        
        const newSale: ProductSale = cleanFormData as ProductSale;
        
        // --- ALL WRITES HAPPEN LAST ---
        
        // WRITE 1: Update stock
        transaction.update(stockItemRef, { quantity: increment(-1), lastUpdatedAt: new Date().toISOString() });
        
        // WRITE 2: Update customer if token was available
        if (customer.tokenIsAvailable) {
            transaction.update(customerDocRef, {
                tokenIsAvailable: false,
                purchasingItem: newSale.productName,
                purchasingItemCode: newSale.productCode ?? null,
                totalValue: newSale.price,
                discountValue: formData.discountValue ?? null,
                downPayment: formData.downPayment ?? null,
                installments: newSale.installments,
                monthlyInstallment: newSale.monthlyInstallment,
            });
        }

        // WRITE 3: Create the new product sale record
        transaction.set(newSaleRef, newSale);

        // WRITE 4+: Distribute commissions if it's a cash payment
        if (newSale.paymentMethod === 'cash') {
            const salesman = allUsers.find(u => u.id === customer.salesmanId);
            if (!salesman) {
                throw new Error(`Could not find the original salesman (ID: ${customer.salesmanId}) for this token.`);
            }
            
            const applicableTier = productSettings.tiers.find(tier => 
                newSale.price >= tier.minPrice && (tier.maxPrice === null || newSale.price <= tier.maxPrice)
            );
            
            if (applicableTier) {
                let currentUser: User | undefined = salesman;
                while(currentUser) {
                    const roleKey = currentUser.role.replace(/\s/g, '').charAt(0).toLowerCase() + currentUser.role.replace(/\s/g, '').slice(1) as keyof typeof applicableTier.commissions;
                    const tierCommissions = applicableTier.commissions[roleKey];
                    
                    if (tierCommissions) {
                        const commission = tierCommissions.cash; // Use the cash commission amount
                        if (commission > 0) {
                            const userRef = doc(db, "users", currentUser.id);
                            transaction.update(userRef, { totalIncome: increment(commission) });

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
                                productSaleId: newSale.id,
                                customerId: customer.id,
                                customerName: customer.name,
                                tokenSerial: newSale.tokenSerial,
                                productName: newSale.productName,
                                productPrice: newSale.price,
                                paymentMethod: newSale.paymentMethod,
                            };
                            transaction.set(incomeRecordRef, newIncomeRecord);
                        }
                    }
                    currentUser = currentUser.referrerId ? allUsers.find(u => u.id === currentUser!.referrerId) : undefined;
                }

                const adminCommissionInfo = applicableTier.commissions.admin;
                if (adminCommissionInfo) {
                    const adminCommission = adminCommissionInfo.cash;
                    if (adminCommission > 0) {
                        const adminUsers = allUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin');
                        for (const adminUser of adminUsers) {
                            const userRef = doc(db, "users", adminUser.id);
                            transaction.update(userRef, { totalIncome: increment(adminCommission) });

                            const incomeRecordRef = doc(collection(db, "incomeRecords"));
                            const newIncomeRecord: IncomeRecord = {
                                id: incomeRecordRef.id,
                                userId: adminUser.id,
                                amount: adminCommission,
                                saleDate: saleDate,
                                grantedForRole: adminUser.role,
                                salesmanId: salesman.id,
                                salesmanName: salesman.name,
                                shopManagerName: shopManager.name,
                                sourceType: 'product_sale',
                                productSaleId: newSale.id,
                                customerId: customer.id,
                                customerName: customer.name,
                                tokenSerial: newSale.tokenSerial,
                                productName: newSale.productName,
                                productPrice: newSale.price,
                                paymentMethod: newSale.paymentMethod,
                            };
                            transaction.set(incomeRecordRef, newIncomeRecord);
                        }
                    }
                }
            }
        }
    });
}


export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  const userDocRef = doc(db, "users", userId);
  await updateDoc(userDocRef, data);
}

export async function updateUserPassword(newPassword: string): Promise<void> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("No user is currently signed in.");
    }
    await updatePassword(currentUser, newPassword);
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
    "Branch Admin": true,
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
              productSaleId: saleData.id, // Link to the product sale
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
        const adminUsers = allUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin');
        for (const adminUser of adminUsers) {
          const userRef = doc(db, "users", adminUser.id);
          batch.update(userRef, { totalIncome: increment(perInstallmentAdminCommission) });

          const incomeRecordRef = doc(collection(db, "incomeRecords"));
          const newIncomeRecord: IncomeRecord = {
            id: incomeRecordRef.id,
            userId: adminUser.id,
            amount: perInstallmentAdminCommission,
            saleDate: paymentDate,
            grantedForRole: adminUser.role,
            salesmanId: salesman.id,
            salesmanName: salesman.name,
            shopManagerName: saleData.shopManagerName,
            sourceType: 'product_sale',
            productSaleId: saleData.id, // Link to the product sale
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

export async function payRemainingInstallments(productSaleId: string): Promise<void> {
    const batch = writeBatch(db);
    const saleDocRef = doc(db, "productSales", productSaleId);
    const saleDocSnap = await getDoc(saleDocRef);

    if (!saleDocSnap.exists()) throw new Error("Product sale not found.");
    
    const saleData = saleDocSnap.data() as ProductSale;
    const { installments, paidInstallments } = saleData;

    if (saleData.paymentMethod !== 'installments' || installments === undefined || paidInstallments === undefined) {
        throw new Error("This sale is not an installment plan.");
    }
    
    const remainingInstallments = installments - paidInstallments;
    if (remainingInstallments <= 0) {
        throw new Error("All installments have already been paid.");
    }

    const customerDocRef = doc(db, "customers", saleData.customerId);
    const customerDocSnap = await getDoc(customerDocRef);
    if (!customerDocSnap.exists()) throw new Error("Could not find the customer for this sale.");
    
    const customer = customerDocSnap.data() as Customer;
    const allUsers = await getAllUsers();
    const salesman = allUsers.find(u => u.id === customer.salesmanId);
    if (!salesman) throw new Error("Could not find the salesman for this sale.");

    const productSettings = await getProductCommissionSettings();
    const applicableTier = productSettings.tiers.find(tier => 
        saleData.price >= tier.minPrice && (tier.maxPrice === null || saleData.price <= tier.maxPrice)
    );

    if (!applicableTier) throw new Error("Could not find an applicable commission tier for this product price.");

    const paymentDate = new Date().toISOString();

    for (let i = 0; i < remainingInstallments; i++) {
        const currentInstallmentNumber = paidInstallments + 1 + i;
        
        let currentUser: User | undefined = salesman;
        while(currentUser) {
            const roleKey = currentUser.role.replace(/\s/g, '').charAt(0).toLowerCase() + currentUser.role.replace(/\s/g, '').slice(1) as keyof typeof applicableTier.commissions;
            const tierCommissions = applicableTier.commissions[roleKey];
            
            if (tierCommissions && installments) {
                const perInstallmentCommission = tierCommissions.installments / installments;
                if (perInstallmentCommission > 0) {
                    const userRef = doc(db, "users", currentUser.id);
                    batch.update(userRef, { totalIncome: increment(perInstallmentCommission) });
                    
                    const incomeRecordRef = doc(collection(db, "incomeRecords"));
                    const newIncomeRecord: IncomeRecord = {
                        id: incomeRecordRef.id, userId: currentUser.id, amount: perInstallmentCommission, saleDate: paymentDate,
                        grantedForRole: currentUser.role, salesmanId: salesman.id, salesmanName: salesman.name,
                        shopManagerName: saleData.shopManagerName, sourceType: 'product_sale', productSaleId: saleData.id,
                        customerId: saleData.customerId, customerName: saleData.customerName, tokenSerial: saleData.tokenSerial,
                        productName: saleData.productName, productPrice: saleData.price, paymentMethod: saleData.paymentMethod,
                        installmentNumber: currentInstallmentNumber,
                    };
                    batch.set(incomeRecordRef, newIncomeRecord);
                }
            }
            currentUser = currentUser.referrerId ? allUsers.find(u => u.id === currentUser!.referrerId) : undefined;
        }

        const adminCommissionInfo = applicableTier.commissions.admin;
        if (adminCommissionInfo && installments) {
            const perInstallmentAdminCommission = adminCommissionInfo.installments / installments;
            if (perInstallmentAdminCommission > 0) {
                const adminUsers = allUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin');
                for (const adminUser of adminUsers) {
                    const userRef = doc(db, "users", adminUser.id);
                    batch.update(userRef, { totalIncome: increment(perInstallmentAdminCommission) });

                    const incomeRecordRef = doc(collection(db, "incomeRecords"));
                    batch.set(incomeRecordRef, {
                        id: incomeRecordRef.id, userId: adminUser.id, amount: perInstallmentAdminCommission, saleDate: paymentDate,
                        grantedForRole: adminUser.role, salesmanId: salesman.id, salesmanName: salesman.name,
                        shopManagerName: saleData.shopManagerName, sourceType: 'product_sale', productSaleId: saleData.id,
                        customerId: saleData.customerId, customerName: saleData.customerName, tokenSerial: saleData.tokenSerial,
                        productName: saleData.productName, productPrice: saleData.price, paymentMethod: saleData.paymentMethod,
                        installmentNumber: currentInstallmentNumber,
                    });
                }
            }
        }
    }

    batch.update(saleDocRef, { paidInstallments: installments });

    await batch.commit();
}


// --- Salary Management ---

const DEFAULT_SALARY_SETTINGS: SalarySettings = {
  "BUSINESS PROMOTER (stage 01)": 21000,
  "MARKETING EXECUTIVE (stage 02)": 30000,
  "Team Operation Manager": 40000,
  "Group Operation Manager": 45000,
  "Head Group Manager": 55000,
  "Regional Director": 61000,
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

export async function updateSalarySettings(newSettings: SalarySettings, updatingUser: User): Promise<void> {
    const settingsDocRef = doc(db, "settings", "salaries");

    if (updatingUser.role === 'Super Admin') {
        // Super Admins can update directly
        await setDoc(settingsDocRef, newSettings, { merge: true });
    } else if (updatingUser.role === 'Admin') {
        // Admins create a change request
        const currentSettings = await getSalarySettings();
        const requestRef = doc(collection(db, 'salaryChangeRequests'));
        const newRequest: SalaryChangeRequest = {
            id: requestRef.id,
            requestedBy: updatingUser.id,
            requestedByName: updatingUser.name,
            requestDate: new Date().toISOString(),
            status: 'pending',
            newSettings: newSettings,
            currentSettings: currentSettings,
        };
        await setDoc(requestRef, newRequest);
    } else {
        throw new Error("You do not have permission to change salary settings.");
    }
}

export async function getPendingSalaryChangeRequests(): Promise<SalaryChangeRequest[]> {
    const q = query(collection(db, 'salaryChangeRequests'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as SalaryChangeRequest).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
}

export async function approveSalaryChangeRequest(requestId: string, superAdmin: User): Promise<void> {
    const requestRef = doc(db, 'salaryChangeRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
        throw new Error("Request not found or already processed.");
    }
    const requestData = requestSnap.data() as SalaryChangeRequest;

    const batch = writeBatch(db);

    // Apply the new settings
    const settingsDocRef = doc(db, "settings", "salaries");
    batch.set(settingsDocRef, requestData.newSettings, { merge: true });

    // Update the request status
    batch.update(requestRef, {
        status: 'approved',
        processedBy: superAdmin.id,
        processedByName: superAdmin.name,
        processedDate: new Date().toISOString(),
    });

    await batch.commit();
}

export async function rejectSalaryChangeRequest(requestId: string, superAdmin: User): Promise<void> {
    const requestRef = doc(db, 'salaryChangeRequests', requestId);
    await updateDoc(requestRef, {
        status: 'rejected',
        processedBy: superAdmin.id,
        processedByName: superAdmin.name,
        processedDate: new Date().toISOString(),
    });
}


export async function processMonthlySalaries(adminUser: User, allCustomers: Customer[]): Promise<{ usersPaid: number; totalAmount: number; }> {
    const now = new Date();
    const payoutId = now.toISOString();

    const allUsers = await getAllUsers();
    const enabledUsers = allUsers.filter(u => !u.isDisabled);
    const salarySettings = await getSalarySettings();
    const incentiveSettings = await getIncentiveSettings();
    const batch = writeBatch(db);

    let usersPaid = 0;
    let totalAmount = 0;
    const payoutDate = now.toISOString();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    for (const user of enabledUsers) {
        let userTotalPayout = 0;
        let salaryAmount = 0;
        let incentiveAmount = 0;
        
        let salaryRoleKey: keyof SalarySettings | undefined;
        if (user.role === 'Salesman' && user.salesmanStage) {
            salaryRoleKey = user.salesmanStage;
        } else if (Object.keys(DEFAULT_SALARY_SETTINGS).includes(user.role)) {
            salaryRoleKey = user.role as keyof SalarySettings;
        }
        if (salaryRoleKey) {
            salaryAmount = salarySettings[salaryRoleKey] ?? 0;
        }

        const incentiveRoleKey = (user.salesmanStage || user.role) as Role | SalesmanStage;
        const incentiveConfig = incentiveSettings[incentiveRoleKey];

        if (incentiveConfig && incentiveConfig.target > 0) {
            let salesCount = 0;
            if (user.role === 'Salesman') {
                salesCount = allCustomers.filter(c => 
                    c.salesmanId === user.id &&
                    c.commissionStatus === 'approved' &&
                    new Date(c.saleDate) >= startOfMonth &&
                    new Date(c.saleDate) <= endOfMonth
                ).length;
            } else { // Manager roles
                const { ids: downlineIds } = getDownlineIdsAndUsers(user.id, allUsers);
                salesCount = allCustomers.filter(c => 
                    downlineIds.includes(c.salesmanId) &&
                    c.commissionStatus === 'approved' &&
                    new Date(c.saleDate) >= startOfMonth &&
                    new Date(c.saleDate) <= endOfMonth
                ).length;
            }

            if (salesCount >= incentiveConfig.target) {
                incentiveAmount = incentiveConfig.incentive;
            }
        }
        
        userTotalPayout = salaryAmount + incentiveAmount;

        if (userTotalPayout > 0) {
            usersPaid++;
            totalAmount += userTotalPayout;

            const userRef = doc(db, "users", user.id);
            batch.update(userRef, { totalIncome: increment(userTotalPayout) });

            if (salaryAmount > 0) {
                const salaryRecordRef = doc(collection(db, "incomeRecords"));
                batch.set(salaryRecordRef, {
                    id: salaryRecordRef.id, userId: user.id, amount: salaryAmount, saleDate: payoutDate,
                    grantedForRole: user.role, salesmanId: user.id, salesmanName: user.name,
                    sourceType: 'salary', payoutId: payoutId,
                });
            }

            if (incentiveAmount > 0) {
                 const incentiveRecordRef = doc(collection(db, "incomeRecords"));
                 batch.set(incentiveRecordRef, {
                    id: incentiveRecordRef.id, userId: user.id, amount: incentiveAmount, saleDate: payoutDate,
                    grantedForRole: user.role, salesmanId: user.id, salesmanName: user.name,
                    sourceType: 'incentive', payoutId: payoutId, incentiveForRole: incentiveRoleKey,
                });
            }
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
        processedByName: adminUser.name,
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

export async function reverseSalaryPayout(payoutId: string, adminUser: User): Promise<void> {
    const batch = writeBatch(db);
    const payoutDocRef = doc(db, "salaryPayouts", payoutId);
    
    const incomeQuery = query(collection(db, "incomeRecords"), where("payoutId", "==", payoutId));
    const incomeRecordsSnap = await getDocs(incomeQuery);
    
    if (incomeRecordsSnap.empty) {
        const payoutSnap = await getDoc(payoutDocRef);
        if (payoutSnap.exists() && !payoutSnap.data()?.isReversed) {
             batch.update(payoutDocRef, {
                isReversed: true,
                reversedBy: adminUser.id,
                reversedByName: adminUser.name,
                reversalDate: new Date().toISOString()
            });
        }
        await batch.commit();
        return;
    }

    for (const recordDoc of incomeRecordsSnap.docs) {
        const record = recordDoc.data() as IncomeRecord;
        
        const userRef = doc(db, "users", record.userId);
        batch.update(userRef, { totalIncome: increment(-record.amount) });
        
        batch.delete(recordDoc.ref);
    }
    
    batch.update(payoutDocRef, {
      isReversed: true,
      reversedBy: adminUser.id,
      reversedByName: adminUser.name,
      reversalDate: new Date().toISOString()
    });
    
    await batch.commit();
}


export async function getIncomeRecordsForPayout(payoutId: string): Promise<IncomeRecord[]> {
    const recordsCol = collection(db, "incomeRecords");
    const q = query(recordsCol, where("payoutId", "==", payoutId));
    const recordsSnap = await getDocs(q);
    const records = recordsSnap.docs.map(doc => doc.data() as IncomeRecord);
    return records.sort((a, b) => a.salesmanName.localeCompare(b.salesmanName));
}

// --- Stock Management ---

export async function addStockItem(item: Omit<StockItem, 'id' | 'lastUpdatedAt'>): Promise<void> {
    const stockCollection = collection(db, "stock");
    await addDoc(stockCollection, {
        ...item,
        lastUpdatedAt: new Date().toISOString(),
    });
}

export async function updateStockItem(itemId: string, updates: Partial<Omit<StockItem, 'id' | 'lastUpdatedAt'>>): Promise<void> {
    const itemDocRef = doc(db, "stock", itemId);
    await updateDoc(itemDocRef, {
        ...updates,
        lastUpdatedAt: new Date().toISOString(),
    });
}

export async function deleteStockItem(itemId: string): Promise<void> {
    const itemDocRef = doc(db, "stock", itemId);
    await deleteDoc(itemDocRef);
}

// --- Incentive Settings ---

const DEFAULT_INCENTIVE_SETTINGS: IncentiveSettings = {
    "BUSINESS PROMOTER (stage 01)": { target: 40, incentive: 10000 },
    "MARKETING EXECUTIVE (stage 02)": { target: 60, incentive: 15000 },
    "Team Operation Manager": { target: 500, incentive: 25000 },
};

export async function getIncentiveSettings(): Promise<IncentiveSettings> {
    const settingsDocRef = doc(db, "settings", "incentives");
    const settingsDocSnap = await getDoc(settingsDocRef);
    if (settingsDocSnap.exists()) {
        const data = settingsDocSnap.data() as IncentiveSettings;
        return { ...DEFAULT_INCENTIVE_SETTINGS, ...data };
    }
    await setDoc(settingsDocRef, DEFAULT_INCENTIVE_SETTINGS);
    return DEFAULT_INCENTIVE_SETTINGS;
}

export async function updateIncentiveSettings(data: IncentiveSettings): Promise<void> {
    const settingsDocRef = doc(db, "settings", "incentives");
    await setDoc(settingsDocRef, data, { merge: true });
}

export async function getSalesmanIncentiveSettings(): Promise<IncentiveSettings> {
    const settingsDocRef = doc(db, "settings", "incentives");
    const settingsDocSnap = await getDoc(settingsDocRef);
    if (settingsDocSnap.exists()) {
        return settingsDocSnap.data() as IncentiveSettings;
    }
    return {};
}

// Slip Management

export async function deleteSlipsForMonth(slipGroupIds: string[]): Promise<void> {
  const batch = writeBatch(db);

  for (const slipGroupId of slipGroupIds) {
    const q = query(
      collection(db, 'commissionRequests'),
      where('slipGroupId', '==', slipGroupId)
    );
    const querySnapshot = await getDocs(q);

    let slipUrlToDelete: string | null = null;
    let canDelete = true;
    
    querySnapshot.forEach((doc) => {
      const requestData = doc.data() as CommissionRequest;
      if (requestData.status !== 'pending') {
          canDelete = false; // Do not proceed if any request in the group is already processed
      }
      if (requestData.depositSlipUrl) {
          slipUrlToDelete = requestData.depositSlipUrl;
      }
    });

    if (canDelete) {
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, {
                depositSlipUrl: deleteField(),
                slipGroupId: deleteField(),
            });
        });
        
        if (slipUrlToDelete) {
            try {
                const storageRef = ref(storage, slipUrlToDelete);
                await deleteObject(storageRef);
            } catch (error: any) {
                console.error(`Failed to delete slip from storage: ${slipUrlToDelete}`, error);
            }
        }
    }
  }

  await batch.commit();
}


// Reminder Management

export async function createReminder(reminderData: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Promise<void> {
  await addDoc(collection(db, "reminders"), {
    ...reminderData,
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
}

export async function getRemindersForUser(userId: string): Promise<Reminder[]> {
    const q = query(collection(db, "reminders"), where("salesmanId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
}

export async function updateReminder(reminderId: string, updates: Partial<Reminder>): Promise<void> {
    await updateDoc(doc(db, "reminders", reminderId), updates);
}

export async function deleteReminder(reminderId: string): Promise<void> {
    await deleteDoc(doc(db, "reminders", reminderId));
}

// Expense Management
export async function addExpenseForSalesman(
    salesmanId: string, 
    amount: number, 
    description: string, 
    manager: User
): Promise<void> {
    if (amount <= 0) {
        throw new Error("Expense amount must be positive.");
    }

    const batch = writeBatch(db);
    const salesmanRef = doc(db, "users", salesmanId);
    const salesmanSnap = await getDoc(salesmanRef);
    if (!salesmanSnap.exists()) {
        throw new Error("Salesman not found.");
    }
    const salesman = salesmanSnap.data() as User;

    // 1. Subtract amount from salesman's total income
    batch.update(salesmanRef, {
        totalIncome: increment(-amount) // Use negative amount to subtract
    });

    // 2. Create an income record with 'expense' type
    const expenseRecordRef = doc(collection(db, "incomeRecords"));
    const newExpenseRecord: IncomeRecord = {
        id: expenseRecordRef.id,
        userId: salesmanId,
        amount: amount, // Store as a positive number
        saleDate: new Date().toISOString(),
        grantedForRole: salesman.role,
        salesmanId: salesman.id,
        salesmanName: salesman.name,
        sourceType: 'expense',
        expenseDescription: description,
        managerId: manager.id,
        managerName: manager.name
    };
    batch.set(expenseRecordRef, newExpenseRecord);

    await batch.commit();
}


// This function is defined here but imported and used in server actions.
export async function sendOtpSms(mobileNumber: string, otp: string): Promise<{success: boolean, error?: string}> {
    return sendSmsForOtp(mobileNumber, otp);
}
