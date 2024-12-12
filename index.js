require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));


mongoose
  .connect('mongodb://localhost:27017/stripe-checkout')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

  const orderSchema = new mongoose.Schema(
    {
      email: { type: String, required: true },
      items: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
          quantity: { type: Number, required: true },
        },
      ],
      amount: { type: Number, required: true },
      status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
    },
    { timestamps: true }
  );
  
  const Order = mongoose.model('Order', orderSchema);

  
 
  app.post('/api/payment/checkout-session', async (req, res) => {
    const { email, cartItems } = req.body;
  
    if (!email || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Email and cart items are required' });
    }
  
   
    const amount = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  
    try {
     
      const order = new Order({
        email,
        items: cartItems,
        amount,
        status: 'Pending',
      });
      await order.save();
  
     
      const paymentSuccess = Math.random() > 0.2; 
  
      if (paymentSuccess) {
        order.status = 'Success';
        await order.save();
        return res.status(200).json({ message: 'Payment successful', order });
      } else {
        order.status = 'Failed';
        await order.save();
        return res.status(400).json({ message: 'Payment failed', order });
      }
    } catch (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

const products = [
    { id: 1, name: 'Product 1', price: 1000 },
    { id: 2, name: 'Product 2', price: 2000 },
    { id: 3, name: 'Product 3', price: 3000 },
    { id: 4, name: 'Product 3', price: 4000 },
];


let cart = [];


app.get('/', (req, res) => {
    res.render('products', { products });
});

app.get('/cart', (req, res) => {
    res.render('cart', { cart });
});


app.post('/cart', (req, res) => {
    const productId = req.body.productId;

    const product = products.find(p => p.id == productId);
    if (product) {
        cart.push(product); 
    }

    res.redirect('/cart');
});

app.get('/checkout', (req, res) => {
    res.render('checkout', { cart });
});

app.post('/create-checkout-session', async (req, res) => {
    const { email } = req.body;
    if (!email || cart.length === 0) {
        return res.redirect('/checkout?error=invalid');
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: cart.map(product => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: product.name,
                },
                unit_amount: product.price,
            },
            quantity: 1,
        })),
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/failed`,
    });

    res.redirect(session.url);
});


app.get('/success', (req, res) => {
    res.render('success');
});


app.get('/failed', (req, res) => {
    res.render('failed');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
