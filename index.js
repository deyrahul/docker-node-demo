import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import JWT from 'jsonwebtoken';
import User from './db/schemas/userSchema';
import Product from './db/schemas/productSchema';

const PORT = 8001;
const app = express();
const encryptKey = 'userandproduct';

mongoose.connect('mongodb://localhost:27017/user_products');

app.use(bodyParser.json());
app.use(cors());



app.post('/users/registration', (req, res, next) => {

    const { email, name, password } = req.body;

    if (email && name && password) {
        next();
    }
    else {
        res.status(402);
        res.send({
            message: 'Email, Name and Password is required for the registration',
        });
    }

}, (req, res, next) => {

    const checkUserInSystem = (userInfo) => {
        return new Promise((resolve, reject) => {
            User.findOne({
                email: userInfo.email
            }, (err, data) => (!err) ? ((data) ? reject('ALREADY_EXISTS') : resolve({ userInfo })) : reject('DB_ERROR'));
        })
    }

    const userEntry = ({ userInfo }) => new Promise((resolve, reject) => {

        const user = new User(userInfo);
        user.save((err, data) => (!err) ? resolve({ data }) : reject('DB_ERROR'));
    })

    checkUserInSystem(req.body)
        .then(userEntry)
        .then((userInfo) => {
            res.send({
                message: 'Successfully registered, Please login',
                data: userInfo
            })
        })
        .catch(err => {
            switch (err) {
                case 'DB_ERROR': {
                    res.status(401);
                    res.send({
                        message: err,
                    });
                    break;
                }
                case 'ALREADY_EXISTS': {
                    res.status(402);
                    res.send({
                        message: err,
                    });
                }
                default: {
                    res.status(404);
                    res.send({
                        message: err,
                    });
                }
            }
        })
})

app.post('/users/login', (req, res, next) => {

    const { email, name, password } = req.body;

    if (email && password) {
        next();
    }
    else {
        res.status(402);
        res.send({
            message: 'Email, Password is required for the registration',
        });
    }

}, (req, res, next) => {

    const checkUser = ({ email, password }) => new Promise((resolve, reject) => {
        User.findOne({
            email: email,
            password: password
        }, (err, userInfo) => (!err) ? ((userInfo) ? resolve({ userInfo }) : reject('USER_NOT_FOUND')) : reject('DB_ERROR'))
    });

    const createJWtToken = ({ userInfo }) => new Promise((resolve, reject) => {

        var token = Math.random().toString(36).substring(2);
        userInfo.accessToken = token;
        userInfo.save((err, data) => (!err) ? resolve({ data }) : reject('DB_ERROR'))

    });

    checkUser(req.body)
        .then(createJWtToken)
        .then((userInfo) => {
            res.send({
                message: 'Successfully login',
                data: userInfo
            })
        })
        .catch(err => {
            switch (err) {
                case 'DB_ERROR': {
                    res.status(401);
                    res.send({
                        message: err,
                    });
                    break;
                }
                case 'USER_NOT_FOUND': {
                    res.status(402);
                    res.send({
                        message: err,
                    });
                }
                default: {
                    res.status(404);
                    res.send({
                        message: err,
                    });
                }
            }
        })


});

app.use('/secure/*', (req, res, next) => {


    const { accesstoken } = req.headers;

    if (accesstoken) {

        next();
    } else {
        res.status(401);
        res.send({
            message: 'Access Token is required'
        });
    }

}, (req, res, next) => {

    const { accesstoken } = req.headers;

    User.findOne({
        accessToken: accesstoken
    }, (err, userInfo) => {
        if (err) {
            res.status(401);
            res.send({
                message: err.message
            });
        } else {
            if (userInfo) {
                req.userInfo = userInfo;
                next();
            } else {
                res.status(401);
                res.send({
                    message: 'Token is invalid'
                });
            }
        }
    })
})

app.get('/secure/users/get-users', (req, res, next) => {
    User.find({}, { name: 1, email: 1 }, (err, users) => {
        if (err) {
            res.status(401);
            res.send({
                message: err.message
            });
        } else {
            res.send({
                message: 'Successfully fetched all users info',
                data: users
            });
        }
    })
});

app.put('/secure/users/edit-info', (req, res, next) => {
    const { name } = req.body;
    if (name) {
        next();
    } else {
        res.status(402)
        res.send({
            message: 'Need only one field to update'
        })
    }
}, (req, res, next) => {

    const checkUser = (userId, user) => new Promise((resolve, reject) => {
        User.findOne({
            _id: userId
        }, (err, userInfo) => (!err) ? ((userInfo) ? resolve({ exsistingUserInfo: userInfo, newUserInfo: user }) : reject('USER_NOT_FOUND')) : reject('DB_ERROR'))
    });

    const editUserInfo = ({ exsistingUserInfo, newUserInfo }) => new Promise((resolve, reject) => {

        const exsistUser = JSON.parse(JSON.stringify(exsistingUserInfo));

        for (var i in exsistUser) {
            exsistingUserInfo[i] = newUserInfo[i] || exsistUser[i];
        }
        exsistingUserInfo.save((err, userInfo) => {
            if (err) {
                reject(err);
            } else {
                resolve(userInfo);
            }
        })
    })
    checkUser(req.userInfo._id, req.body)
        .then(editUserInfo)
        .then((data) => {
            res.send({
                message: 'Successfully update the Info',
                data
            })
        })
        .catch(err => {
            res.status(401);
            res.send({
                message: err.message
            })
        })
});

app.post('/secure/product/add-product', (req, res, next) => {

    const { productName, productDescription, productPrice } = req.body;

    if (productName && productDescription && productPrice) {
        next();
    }
    else {
        res.status(401);
        res.send({
            message: 'Need Product Name, Description, Price to add a new Product',
        });
    }

}, (req, res, next) => {
    const product = new Product(req.body);
    product.createddBy = req.userInfo._id;
    product.save((err, productInfo) => {
        if (err) {
            res.status(401);
            res.send({
                message: err,
            });
        }
        else {
            res.send({
                message: 'Successfully added the product Info',
                data: productInfo
            })
        }
    })
});

app.get('/secure/product/get-products', (req, res, next) => {

    Product.find({})
        .populate('createddBy')
        .exec((err, productInfo) => {
            if (err) {
                res.status(401);
                res.send({
                    message: err,
                });
            } else {
                res.send({
                    message: 'Successfully Fetch all product',
                    data: productInfo
                })
            }
        })
});

app.put('/secure/product/edit-product', (req, res, next) => {
    const { productId, productName, productDescription, productPrice } = req.body;

    if (productId && (productName || productDescription || productPrice)) {
        next();
    }
    else {
        res.status(401);
        res.send({
            message: 'Need Product Id and Name or Description or Price to edit a Product',
        });
    }
}, (req, res, next) => {
    const checkEditProductAuthorization = (productInfo, userId) => new Promise((resolve, reject) => {
        Product.findOne({
            _id: productInfo._id,
            createddBy: mongoose.Types.ObjectId(userId)
        }, (err, product) => {
            if (err) {
                reject(err);
            } else {
                if (product) {
                    resolve({ exsistingProductInfo: product, editableProductInfo: productInfo });
                }
                else {
                    reject('PRODUCT_NOT_FOUND');
                }
            }
        })
    });

    const editProduct = ({ exsistingProductInfo, editableProductInfo }) => new Promise((resolve, reject) => {
        const exsistingProduct = JSON.parse(JSON.stringify(exsistingProductInfo));
        for (var i in exsistingProduct) {
            exsistingProductInfo[i] = editableProductInfo[i] || exsistingProduct[i];
        }
        exsistingProductInfo.save((err, productInfo) => {
            if (err) {
                reject(err);
            } else {
                resolve(productInfo)
            }
        })
    });

    const ProductInfo = {}
    for (var i in req.body) {
        ProductInfo[i] = req.body[i];
    }
    ProductInfo._id = req.body.productId;
    checkEditProductAuthorization(ProductInfo, req.userInfo._id)
        .then(editProduct)
        .then((data) => {
            res.send({
                message: 'Successfully edit the product Info',
                data
            })
        })
        .catch(err => {
            switch (err) {
                case 'DB_ERROR': {
                    res.status(401);
                    res.send({
                        message: err,
                    });
                    break;
                }
                case 'PRODUCT_NOT_FOUND': {
                    res.status(402);
                    res.send({
                        message: err,
                    });
                }
                default: {
                    res.status(404);
                    res.send({
                        message: err,
                    });
                }
            }
        })
});

app.get('/secure/product/get-product/:productId', (req, res, next) => {
    const { productId } = req.params;
    if (productId) {
        next();
    } else {
        res.status(401);
        res.send({

            message: 'Product Id is required',
        })
    }
}, (req, res, next) => {
    Product.findOne({
        _id: req.params.productId
    }, (err, productInfo) => {
        if (err) {
            res.status(401);
            res.send({

                message: err.message,
            })
        } else {
            if (!productInfo) {
                res.status(404);
                res.send({

                    message: 'Product is not found',
                })
            } else {
                res.send({
                    message: 'Successfully get the Product',
                    data: productInfo
                })
            }
        }
    })
});


app.delete('/secure/product/delete-product/:productId', (req, res, next) => {


    const { productId } = req.params;
    if (productId) {
        next();
    } else {
        res.status(401);
        res.send({

            message: 'Product Id is required',
        })
    }
}, (req, res, next) => {
    const checkEditProductAuthorization = (productId, userId) => new Promise((resolve, reject) => {
        Product.findOne({
            _id: productId,
            createddBy: mongoose.Types.ObjectId(userId)
        }, (err, product) => {
            if (err) {
                reject(err);
            } else {
                if (product) {
                    resolve({ product });
                }
                else {
                    reject('PRODUCT_NOT_FOUND');
                }
            }
        })
    });

    const deleteProduct = ({ product }) => new Promise((resolve, reject) => {

        product.deleteOne({ _id: product._id }, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve()
            }
        })
    });
    const { productId } = req.params;
    checkEditProductAuthorization(productId, req.userInfo._id)
        .then(deleteProduct)
        .then(() => {
            res.send({
                message: 'Successfully remove the product'
            })
        })
        .catch(err => {
            switch (err) {
                case 'DB_ERROR': {
                    res.status(401);
                    res.send({
                        message: err,
                    });
                    break;
                }
                case 'PRODUCT_NOT_FOUND': {
                    res.status(402);
                    res.send({
                        message: err,
                    });
                }
                default: {
                    res.status(404);
                    res.send({
                        message: err,
                    });
                }
            }
        })
});


app.listen(PORT, () => {
    console.log('Server is running on ', PORT);
})





