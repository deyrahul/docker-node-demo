import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    'productName': {
        type: String,
        required: true,
    },
    'productDescription': {
        type: String,
        required: true,
    },
    'productPrice':{
        type: Number,
        required: true,
    },
    'createddBy' : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }
});

const Product = mongoose.model('product', productSchema);

export default Product;