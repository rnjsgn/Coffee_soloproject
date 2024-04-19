var express = require('express');
var router = express.Router();
const ctrl = require('../controller/index');
// const { route } = require('../../app');

router.get('/', ctrl.output.home);

router.get('/menu', ctrl.output.menu);

router.get('/menu_reg', ctrl.output.menu_reg);
router.post('/menu_reg', ctrl.input.menu_reg);

router.get('/menu/:menuId', ctrl.menuDetail);

router.get('/signup', ctrl.output.signup);
router.post('/signup', ctrl.input.signup);

router.get('/login', ctrl.output.login);
router.post('/login', ctrl.input.login);

router.get('/logout', ctrl.output.logout);

router.post('/addtocart', ctrl.input.addtocart);

router.get('/cart', ctrl.output.cart);

router.get('/updateQuantity', ctrl.output.updateQuantity)

router.get('/order', ctrl.output.order);
router.post('/order', ctrl.input.order);

router.get('/orderlist', ctrl.output.orderlist);

router.get('/supply_reg', ctrl.output.supply_reg);
router.post('/supply_reg', ctrl.input.supply_reg);

router.get('/supply_list', ctrl.output.supply_list);

router.get('/supply_detail/:supNo', ctrl.output.supply_detail);

router.get('/mat_reg', ctrl.output.mat_reg);
router.post('/mat_reg', ctrl.input.mat_reg);

router.get('/mat_list', ctrl.output.mat_list);

router.get('/order_finish', ctrl.output.order_finish);

router.get('/menu_ranking', ctrl.output.menu_ranking);

router.get('/menu_ranking_data', ctrl.output.menu_ranking_data);

module.exports = router;