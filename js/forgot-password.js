document.addEventListener('DOMContentLoaded', () => {
  const step1 = document.getElementById('fpStep1');
  const successStep = document.getElementById('fpSuccess');
  const emailInput = document.getElementById('fpIdentifier');
  const sendBtn = document.getElementById('sendResetLinkBtn');

  sendBtn?.addEventListener('click', async () => {
    const email = (emailInput.value || '').trim();

    if (!email) {
      return Utils.showToast('Please enter your email address', 'warning');
    }

    // Basic email validation
    if (!email.includes('@')) {
      return Utils.showToast('Please enter a valid email address', 'error');
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      // Firebase Password Reset Strategy
      await FB_AUTH.sendPasswordResetEmail(email);

      Utils.showToast('Reset link sent to ' + email, 'success');
      step1.classList.add('hidden');
      successStep.classList.remove('hidden');

    } catch (error) {
      console.error("Firebase Reset Error:", error);
      let message = "Failed to send reset link. " + error.message;
      if (error.code === 'auth/user-not-found') message = "No account found with this email.";

      Utils.showToast(message, 'error');
      sendBtn.disabled = false;
      sendBtn.innerHTML = 'Send Reset Link';
    }
  });
});