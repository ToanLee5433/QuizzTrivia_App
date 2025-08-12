import { addDoc, collection, query, where, getDocs, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { emailJSService } from '../../../services/emailJSService';

export interface OTPVerification {
  id?: string;
  email: string;
  code: string;
  expiresAt: Date | any; // Firebase Timestamp
  isVerified: boolean;
  createdAt: Date | any; // Firebase Timestamp
  attempts: number;
  maxAttempts: number;
}

// Generate random 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in Firestore
export const storeOTP = async (email: string, code: string): Promise<string> => {
  try {
    // Delete any existing OTP for this email
    await deleteExistingOTP(email);

    // Create new OTP record
    const otpData: Omit<OTPVerification, 'id'> = {
      email: email.toLowerCase().trim(),
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expires in 10 minutes
      isVerified: false,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3
    };

    const docRef = await addDoc(collection(db, 'otp_verifications'), otpData);
    return docRef.id;
  } catch (error) {
    console.error('Error storing OTP:', error);
    throw new Error('Failed to store OTP verification');
  }
};

// Delete existing OTP for email
export const deleteExistingOTP = async (email: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'otp_verifications'),
      where('email', '==', email.toLowerCase().trim())
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting existing OTP:', error);
  }
};

// Verify OTP code
export const verifyOTP = async (email: string, inputCode: string): Promise<{ success: boolean; message: string }> => {
  try {
    const q = query(
      collection(db, 'otp_verifications'),
      where('email', '==', email.toLowerCase().trim()),
      where('isVerified', '==', false)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, message: 'Không tìm thấy mã OTP hoặc mã đã hết hạn' };
    }

    const otpDoc = querySnapshot.docs[0];
    const otpData = otpDoc.data() as OTPVerification;
    
    // Check if OTP has expired
    const expiresAt = otpData.expiresAt instanceof Date ? otpData.expiresAt : otpData.expiresAt.toDate();
    if (new Date() > expiresAt) {
      await deleteDoc(otpDoc.ref);
      return { success: false, message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới' };
    }

    // Check max attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      await deleteDoc(otpDoc.ref);
      return { success: false, message: 'Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới' };
    }

    // Verify code
    if (otpData.code === inputCode.trim()) {
      // Mark as verified and delete the record
      await deleteDoc(otpDoc.ref);
      return { success: true, message: 'Xác thực thành công!' };
    } else {
      // Increment attempts
      await updateDoc(otpDoc.ref, {
        attempts: otpData.attempts + 1
      });
      
      const remainingAttempts = otpData.maxAttempts - (otpData.attempts + 1);
      return { 
        success: false, 
        message: `Mã OTP không đúng. Còn lại ${remainingAttempts} lần thử` 
      };
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'Có lỗi xảy ra khi xác thực mã OTP' };
  }
};

// Send OTP via email (using EmailJS - no server required)
export const sendOTPEmail = async (email: string, code: string): Promise<boolean> => {
  try {
    console.log(`📧 Sending OTP via EmailJS to ${email}...`);
    
    // Gửi email qua EmailJS (trực tiếp từ browser)
    const result = await emailJSService.sendOTPEmail(email, code);
    
    if (result.success) {
      console.log(`✅ OTP email sent successfully to ${email}`);
      
      // Lưu vào email_queue để tracking
      try {
        await addDoc(collection(db, 'email_queue'), {
          to: email,
          template: 'otp_verification',
          data: {
            code,
            expiresIn: '10 phút'
          },
          createdAt: serverTimestamp(),
          status: 'sent_via_emailjs',
          method: 'emailjs'
        });
      } catch (dbError) {
        console.warn('Failed to log email to queue:', dbError);
        // Không fail toàn bộ process nếu logging thất bại
      }
      
      return true;
    } else {
      throw new Error(result.messageKey || 'Failed to send email via EmailJS');
    }
  } catch (error: any) {
    console.error('Error sending OTP email:', error);
    throw new Error(error.message || 'Không thể gửi email. Vui lòng kiểm tra kết nối internet.');
  }
};

// Main function to generate and send OTP
export const generateAndSendOTP = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const code = generateOTP();
    
    console.log(`🔢 Generated OTP: ${code} for ${email}`);
    
    // Store OTP in database first
    await storeOTP(email, code);
    console.log(`💾 OTP stored in database for ${email}`);
    
    // Send email via SMTP
    await sendOTPEmail(email, code);
    
    return { 
      success: true, 
      message: `Mã xác thực đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư và nhập mã 6 số.` 
    };
  } catch (error: any) {
    console.error('Error generating and sending OTP:', error);
    
    // Check specific error types
    if (error.message.includes('internet') || error.message.includes('network')) {
      return { 
        success: false, 
        message: 'Không thể kết nối internet. Vui lòng kiểm tra kết nối mạng và thử lại.' 
      };
    }
    
    return { 
      success: false, 
      message: error.message || 'Có lỗi xảy ra khi gửi mã xác thực. Vui lòng thử lại sau.' 
    };
  }
};

// Cleanup expired OTPs (should be called periodically)
export const cleanupExpiredOTPs = async (): Promise<void> => {
  try {
    const q = query(collection(db, 'otp_verifications'));
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    const deletePromises = querySnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return now > data.expiresAt.toDate();
      })
      .map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
};
