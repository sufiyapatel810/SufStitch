// ============================================================
//  razorpay.js — SufStitch Payment Integration
// ============================================================

// ── YOUR RAZORPAY TEST KEY ──
// Replace with your actual Key ID from Razorpay dashboard
const RAZORPAY_KEY = 'rzp_live_SiQsDzbpQkOXr9'

// ── MAIN PAYMENT FUNCTION ──
function openRazorpay(orderDetails, onSuccess) {

  const options = {
    // Your Razorpay Key ID
    key: RAZORPAY_KEY,

    // Amount must be in PAISE (multiply rupees by 100)
    // Example: ₹849 = 84900 paise
    amount: orderDetails.total * 100,

    currency: 'INR',

    name: 'SufStitch',
    description: 'Handmade Crochet Products',

    image: 'images/logooo.jpg',

    // Pre-fill customer details
    prefill: {
      name:    orderDetails.name,
      contact: orderDetails.phone,
    },

    // Razorpay theme color
    theme: {
      color: '#7c4f2a'
    },

    // What happens when payment is SUCCESSFUL
    handler: function(response) {
      console.log('Payment successful!')
      console.log('Payment ID:', response.razorpay_payment_id)

      // Call the success function from script.js
      onSuccess(response.razorpay_payment_id)
    },

    // What happens when user CLOSES payment window
    modal: {
      ondismiss: function() {
        console.log('Payment cancelled by user')
        // Re-enable the place order button
        const btn = document.getElementById('place-order-btn')
        if (btn) {
          btn.disabled  = false
          btn.innerHTML = `
            <i class="fas fa-lock"></i>
            Pay — ₹${orderDetails.total}`
        }
      }
    }
  }

  // Open the Razorpay payment popup
  const rzp = new Razorpay(options)
  rzp.open()
}

export { openRazorpay }