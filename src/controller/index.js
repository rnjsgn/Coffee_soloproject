const pool = require('../../db/db')

// main 화면
const output = {
    home : (req,res) => {
        res.render('home');
    },
    menu: async (req, res) => {
      try {
          let searchData = req.query.menuSearch || ''; // 검색어를 가져오고, 없으면 빈 문자열로 초기화
          let q1;

          if (searchData === '') {
              // 검색어가 없을 때는 전체 메뉴 조회
              q1 = 'SELECT * FROM menu';
          } else {
              // '%'를 사용하여 부분 일치 검색을 수행
              q1 = 'SELECT * FROM menu WHERE menu_name LIKE ?';
          }

          const data = await pool.query(q1, [`%${searchData}%`]);

          res.render('menu', { data: data[0], searchData: searchData });
      } catch (error) {
          console.error('메뉴 조회 중 오류 발생: ', error);
          res.status(500).send('메뉴 조회 중 오류가 발생했습니다.');
      }
    },
    menu_reg: async (req, res) => {
      res.render('menu_reg');
    },
    signup : (req,res) => {
        res.render('signup');
    },
    login : (req,res) => {
        res.render('login');
    },
    logout: (req, res) => {
      // 세션을 다시 시작
      req.session.regenerate((err) => {
        if (err) {
          console.error('로그아웃 중 오류 발생: ', err);
          res.status(500).send('로그아웃 중 오류가 발생했습니다.');
        } else {
          res.redirect('/');
        }
      });
    },
    cart : async (req,res) => {
      if (req.session.user) {
        try {
          const userTel = req.session.user.user_tel;
    
          // 1. 사용자의 카트 정보 가져오기
          const getCartQuery = 'SELECT * FROM cart WHERE user_user_tel = ?';
          const [cartRows] = await pool.query(getCartQuery, [userTel]);
    
          if (cartRows.length > 0) {
            const cartId = cartRows[0].cart_no;
    
            // 2. cart_menu 테이블에서 각 메뉴 정보 가져오기
            const getCartMenuQuery = 'SELECT * FROM cart_menu WHERE cart_cart_no = ?';
            const [cartMenuRows] = await pool.query(getCartMenuQuery, [cartId]);
    
            // 3. 메뉴 정보를 기반으로 장바구니 페이지에 전달
            res.render('cart', { session: req.session, cartItems: cartMenuRows });
          } else {
            // 카트가 비어있는 경우
            res.render('cart', { session: req.session, cartItems: [] });
          }
        } catch (error) {
          console.error('장바구니 확인 중 오류 발생: ', error);
          res.status(500).send('장바구니 확인 중 오류가 발생했습니다.');
        }
      } else {
        // 로그인하지 않은 경우에는 로그인 페이지로 리다이렉트
        res.redirect('/login');
      }
    },
    updateQuantity: async (req, res) => {
      const { menuNo, amount } = req.query;
    
      try {
        // 수량 업데이트 쿼리 실행
        const updateQuantityQuery = 'UPDATE cart_menu SET cart_menu_count = cart_menu_count + ? WHERE cart_menu_no = ?';
        await pool.query(updateQuantityQuery, [parseInt(amount), menuNo]);
    
        // 새로운 총 가격 계산
        const getNewCartNoQuery = 'SELECT cart_cart_no FROM cart_menu WHERE cart_menu_no = ?';
        const [cartNoRows] = await pool.query(getNewCartNoQuery, [menuNo]);
        const newCartNo = cartNoRows[0].cart_cart_no;
    
        const getNewTotalQuery = 'SELECT SUM(cart_menu_price * cart_menu_count) AS newTotal FROM cart_menu WHERE cart_cart_no = ?';
        const [newTotalRows] = await pool.query(getNewTotalQuery, [newCartNo]);
        const newTotal = newTotalRows[0].newTotal;
    
        // 총 가격을 cart 테이블에 반영
        const updateCartTotalQuery = 'UPDATE cart SET cart_total_price = ? WHERE cart_no = ?';
        await pool.query(updateCartTotalQuery, [newTotal, newCartNo]);
    
        res.json({ success: true, newTotal });
      } catch (error) {
        console.error('수량 업데이트 중 오류 발생: ', error);
        res.json({ success: false, error: '수량 업데이트 중 오류가 발생했습니다.' });
      }
    },
    order: async (req, res) => {
      try {
          const userTel = req.session.user.user_tel;
  
          const getCartQuery = 'SELECT * FROM cart WHERE user_user_tel = ?';
          const [cartRows] = await pool.query(getCartQuery, [userTel]);
  
          if (cartRows.length > 0) {
              const cartId = cartRows[0].cart_no;
  
              const getCartMenuQuery = 'SELECT * FROM cart_menu WHERE cart_cart_no = ?';
              const [cartMenuRows] = await pool.query(getCartMenuQuery, [cartId]);
  
              let totalCartPrice = 0;
              for (const cartItem of cartMenuRows) {
                  totalCartPrice += cartItem.cart_menu_price * cartItem.cart_menu_count;
              }
  
              const orderList = cartMenuRows.map(cartItem => cartItem.cart_menu_name).join(', ');
  
              const pointToAccrue = Math.floor(totalCartPrice * 0.1);
  
              const getUserPointQuery = 'SELECT user_point FROM user WHERE user_tel = ?';
              const [userPointResult] = await pool.query(getUserPointQuery, [userTel]);
  
              if (userPointResult.length > 0) {
                  const currentUserPoint = userPointResult[0].user_point;
  
                  res.render('order', { session: req.session, cartItems: cartMenuRows, totalCartPrice, pointToAccrue, currentUserPoint });
              } else {
                  res.status(400).send('사용자 정보를 찾을 수 없습니다.');
              }
          } else {
              res.render('order', { session: req.session, cartItems: [], totalCartPrice: 0, pointToAccrue: 0, currentUserPoint: 0 });
          }
      } catch (error) {
          console.error('주문 페이지 로드 중 오류 발생: ', error);
          res.status(500).send('주문 페이지 로드 중 오류가 발생했습니다.');
      }
  },
  
  orderlist: async (req, res) => {
    try {
        const userTel = req.session.user.user_tel;

        // 1. 사용자의 주문 내역 가져오기
        const getOrderListQuery = 'SELECT * FROM `order` WHERE user_user_tel = ? ORDER BY order_day DESC';
        const [orderRows] = await pool.query(getOrderListQuery, [userTel]);

        // 2. 각 주문에 대한 세부 정보 가져오기
        const orderDetails = [];
        for (const order of orderRows) {
            const orderId = order.order_no;

            // 2.1. 주문된 메뉴 목록 가져오기
            const getOrderMenuQuery = `
                SELECT order_menu.*, menu.menu_name
                FROM order_menu
                JOIN menu ON order_menu.menu_menu_no = menu.menu_no
                WHERE order_order_no = ?`;
            const [orderMenuRows] = await pool.query(getOrderMenuQuery, [orderId]);

            // 2.2. 주문 일시, 방식, 총 가격 가져오기
            const orderDetailsQuery = 'SELECT order_day, order_pay, order_total_price FROM `order` WHERE order_no = ?';
            const [orderDetailsRows] = await pool.query(orderDetailsQuery, [orderId]);

            const orderDetail = {
                order_day: orderDetailsRows[0].order_day,
                order_pay: orderDetailsRows[0].order_pay,
                order_total_price: orderDetailsRows[0].order_total_price,
                order_menu_list: orderMenuRows
            };

            orderDetails.push(orderDetail);
        }

        // 3. 주문 내역을 orderlist 페이지에 전달
        res.render('orderlist', { session: req.session, orderList: orderDetails });
    } catch (error) {
        console.error('주문 내역 확인 중 오류 발생: ', error);
        res.status(500).send('주문 내역 확인 중 오류가 발생했습니다.');
    }
},
  supply_reg : (req,res) => {
    res.render('supply_reg');
  },
  supply_list: async (req, res) => {
    try {
      // 공급업체 목록 조회
      const getSuppliersQuery = 'SELECT * FROM suppliers';
      const [suppliersRows] = await pool.query(getSuppliersQuery);

      // 전체 공급업체 목록을 supply_list 페이지에 전달
      res.render('supply_list', { suppliers: suppliersRows });
    } catch (error) {
      console.error('공급업체 목록 조회 중 오류 발생: ', error);
      res.status(500).send('공급업체 목록 조회 중 오류가 발생했습니다.');
    }
  },
  supply_detail: async (req, res) => {
    try {
      const supNo = req.params.supNo;

      // 공급업체 번호에 해당하는 상세 정보 조회
      const getSupplierDetailQuery = 'SELECT * FROM suppliers WHERE sup_no = ?';
      const [supplierDetailRows] = await pool.query(getSupplierDetailQuery, [supNo]);

      // 해당 공급업체의 상세 정보를 supply_detail 페이지에 전달
      res.render('supply_detail', { supplierDetail: supplierDetailRows[0] });
    } catch (error) {
      console.error('공급업체 상세 정보 조회 중 오류 발생: ', error);
      res.status(500).send('공급업체 상세 정보 조회 중 오류가 발생했습니다.');
    }
  },
  mat_reg : (req,res) => {
    res.render('mat_reg');
  },
  mat_list: async (req, res) => {
    try {
        // 데이터베이스에서 재료 데이터 가져오기
        const materialsQuery = 'SELECT * FROM material';
        const [materialsRows] = await pool.query(materialsQuery);

        // 가져온 데이터를 렌더링 시 사용할 수 있도록 전달
        res.render('mat_list', { materials: materialsRows });
    } catch (error) {
        console.error('재료 목록 조회 중 오류 발생: ', error);
        res.status(500).send('재료 목록 조회 중 오류가 발생했습니다.');
    }
  },
  order_finish : (req,res) => {
    res.render('order_finish');
  },
  menu_ranking: async (req, res) => {
    try {
        // 각 메뉴별 주문량을 세는 쿼리
        const rankingQuery = `
            SELECT
                menu.menu_name,
                SUM(order_menu.order_menu_count) AS order_count
            FROM
                menu
            LEFT JOIN
                order_menu ON menu.menu_no = order_menu.menu_menu_no
            GROUP BY
                menu.menu_no
            ORDER BY
                order_count DESC
            LIMIT 2;
        `;

        const [rankingResults] = await pool.query(rankingQuery);

        // rankingResults를 이용하여 필요한 데이터를 추출하여 템플릿에 전달
        res.render('menu_ranking', { rankings: rankingResults });
    } catch (error) {
        console.error('메뉴 랭킹 조회 중 오류 발생: ', error);
        res.status(500).send('메뉴 랭킹 조회 중 오류가 발생했습니다.');
    }
},
menu_ranking_data: (req,res) => {
  res.render('menu_ranking_data');
},
};

const input = {
      menu_reg: async (req, res) => {
        const menuName = req.body.menuName;
        const menuPrice = req.body.menuPrice;
        const menuInfo = req.body.menuInfo;
        const menuCategory = req.body.menuCategory;

        // 메뉴 정보를 삽입하는 SQL 쿼리 작성
        const menuQuery = 'INSERT INTO menu (menu_name, menu_price, menu_info, menu_category) VALUES (?, ?, ?, ?)';
        const [menuResult] = await pool.query(menuQuery, [menuName, menuPrice, menuInfo, menuCategory]);

        res.redirect('/menu');
    },

    signup: async (req, res) => {
      const userName = req.body.userName;
      const userAddress = req.body.userAddress;
      const userTel = req.body.userTel;
  
      // 이미 가입된 전화번호인지 확인
      const checkExistingUserQuery = 'SELECT * FROM user WHERE user_tel = ?';
      const [existingUserRows] = await pool.query(checkExistingUserQuery, [userTel]);
  
      if (existingUserRows.length > 0) {
          // 이미 가입된 전화번호인 경우 알람을 주고 회원가입 중단
          const alertMessage = '이미 가입된 전화번호입니다. 다른 전화번호를 사용해주세요.';
          res.send(`<script>alert("${alertMessage}"); window.location.href="/signup";</script>`);
      } else {
          // 가입되지 않은 전화번호인 경우 회원가입 진행
          // 사용자 이름이 "admin"인 경우 is_admin을 1로, 그 외에는 0으로 설정
          const isAdmin = userName.toLowerCase() === "admin" ? 1 : 0;
          const insertUserQuery = 'INSERT INTO user (user_name, user_address, user_tel, is_admin) VALUES (?, ?, ?, ?)';
          await pool.query(insertUserQuery, [userName, userAddress, userTel, isAdmin]);
          res.redirect('/login');
      }
  },
    login: async (req, res) => {
      const userTel = req.body.userTel;
      const userName = req.body.userName;
      const q = 'SELECT * FROM user WHERE user_name = ? AND user_tel = ?';

      try {
          const [rows, fields] = await pool.query(q, [userName, userTel]);

          if (rows.length === 1) {
              req.session.user = rows[0];
              req.session.is_admin = rows[0].is_admin; // Assuming is_admin is a field in your user data

              // 사용자가 존재하면 로그인 성공
              // 세션 또는 JWT를 사용하여 로그인 세션을 설정할 수 있습니다.
              // 여기에서는 세션을 사용하지 않고 간단히 로그인 성공 메시지를 반환합니다.
              res.redirect('/');
          } else {
              // 사용자가 존재하지 않으면 로그인 실패
              res.status(401).send('로그인 실패');
          }
      } catch (error) {
          // 데이터베이스에서 오류가 발생한 경우
          console.error('로그인 중 오류 발생: ', error);
          res.status(500).send('로그인 중 오류가 발생했습니다.');
      }
  },

    addtocart : async (req, res) => {
      if (req.session.user) {
        const menuId = req.body.menu_no;
        const quantity = 1; // 현재는 하나의 메뉴만 추가하도록 설정
        const userTel = req.session.user.user_tel;
    
        // 1. 사용자의 카트 정보 가져오기
        const getCartQuery = 'SELECT * FROM cart WHERE user_user_tel = ?';
        const [cartRows] = await pool.query(getCartQuery, [userTel]);
    
        let cartId;
    
        if (cartRows.length > 0) {
          // 이미 카트가 있는 경우
          cartId = cartRows[0].cart_no;
        } else {
          // 카트가 없는 경우 새로 생성
          const insertCartQuery = 'INSERT INTO cart (cart_total_price, user_user_tel) VALUES (?, ?)';
          const [insertedCart] = await pool.query(insertCartQuery, [0, userTel]);
          cartId = insertedCart.insertId;
        }
    
        // 2. 메뉴 정보 가져오기
        const getMenuInfoQuery = 'SELECT menu_name, menu_price FROM menu WHERE menu_no = ?';
        const [menuRows] = await pool.query(getMenuInfoQuery, [menuId]);
    
        if (menuRows.length > 0) {
          const menuName = menuRows[0].menu_name;
          const menuPrice = menuRows[0].menu_price;
    
          // 3. cart_menu 테이블에 메뉴 추가 또는 수량 증가
          const getCartItemQuery = 'SELECT * FROM cart_menu WHERE cart_cart_no = ? AND menu_menu_no = ?';
          const [cartItemRows] = await pool.query(getCartItemQuery, [cartId, menuId]);
    
          if (cartItemRows.length > 0) {
            // 이미 장바구니에 있는 메뉴인 경우 수량 증가
            const updateQuantityQuery = 'UPDATE cart_menu SET cart_menu_count = cart_menu_count + ? WHERE cart_cart_no = ? AND menu_menu_no = ?';
            await pool.query(updateQuantityQuery, [quantity, cartId, menuId]);
          } else {
            // 새로운 메뉴인 경우 레코드 추가
            const insertMenuCartQuery = 'INSERT INTO cart_menu (cart_menu_name, cart_menu_price, cart_menu_count, cart_cart_no, menu_menu_no) VALUES (?, ?, ?, ?, ?)';
            await pool.query(insertMenuCartQuery, [menuName, menuPrice, quantity, cartId, menuId]);
          }
    
          // 4. cart_total_price 업데이트
          const updateTotalPriceQuery = 'UPDATE cart SET cart_total_price = (SELECT SUM(cart_menu_price * cart_menu_count) FROM cart_menu WHERE cart_cart_no = ?) WHERE cart_no = ?';
          await pool.query(updateTotalPriceQuery, [cartId, cartId]);
    
          console.log('메뉴가 장바구니에 추가되었습니다.');
          res.redirect('/menu');
        }
      } else {
        const alertMessage = '사용자 정보가 없습니다.';
        res.send(`<script>alert("${alertMessage}"); window.location.href="/";</script>`);
      }
    },
    order: async (req, res) => {
      try {
        // 현재 사용자의 전화번호를 세션에서 가져옴
        const userTel = req.session.user.user_tel;
    
        // 사용자의 장바구니 정보를 조회하는 쿼리
        const getCartQuery = 'SELECT * FROM cart WHERE user_user_tel = ?';
        const [cartRows] = await pool.query(getCartQuery, [userTel]);
    
        if (cartRows.length > 0) {
          // 장바구니가 비어있지 않은 경우
          const cartId = cartRows[0].cart_no;

          // 장바구니에 담긴 메뉴 정보를 조회하는 쿼리
          const getCartMenuQuery = 'SELECT * FROM cart_menu WHERE cart_cart_no = ?';
          const [cartMenuRows] = await pool.query(getCartMenuQuery, [cartId]);

          // 주문 총액
          const orderTotalPrice = cartRows[0].cart_total_price;

          // 주문 날짜
          const orderDay = new Date().toISOString().slice(0, 19).replace('T', ' ');

          // 주문 목록 문자열로 변환
          const orderList = cartMenuRows.map(cartItem => cartItem.cart_menu_name).join(', ');

          // 사용자의 현재 포인트를 조회하는 쿼리
          const getUserPointQuery = 'SELECT user_point FROM user WHERE user_tel = ?';
          const [userPointResult] = await pool.query(getUserPointQuery, [userTel]);

          if (userPointResult.length > 0) {
              // 사용자의 현재 포인트
              let currentUserPoint = userPointResult[0].user_point;

              // 사용할 포인트를 요청에서 받아옴 (없으면 0으로 처리)
              const usePoints = parseInt(req.body.usePoints) || 0;

              // 1000원 단위로 사용 가능한 포인트로 차감
              const remainingPoints = currentUserPoint - (Math.floor(usePoints / 1000) * 1000);

              // 남은 금액에서 10%를 적립
              const accruedPoints = Math.floor((orderTotalPrice - usePoints) * 0.1);

              // 현재 포인트에서 사용한 포인트를 뺀 포인트와 적립된 포인트를 업데이트
              const updatedUserPoint = remainingPoints + accruedPoints;
              const updateUserPointQuery = 'UPDATE user SET user_point = ? WHERE user_tel = ?';
              await pool.query(updateUserPointQuery, [updatedUserPoint, userTel]);

              // 주문 정보를 저장하는 쿼리
              const insertOrderQuery = 'INSERT INTO `order` (user_user_tel, order_total_price, order_day, order_list) VALUES (?, ?, ?, ?)';
              const [orderResult] = await pool.query(insertOrderQuery, [userTel, orderTotalPrice - usePoints, orderDay, orderList]);
    
            // 주문 번호를 가져옴
            const orderId = orderResult.insertId;
    
            // 주문한 메뉴들을 반복하여 order_menu 테이블에 저장하는 쿼리
            for (const cartItem of cartMenuRows) {
              const { cart_menu_name, cart_menu_price, cart_menu_count } = cartItem;
    
              // 주문 메뉴의 가격 계산
              const orderMenuPrice = cart_menu_price * cart_menu_count;
    
              // order_menu 테이블에 주문 메뉴 정보 저장
              const insertOrderMenuQuery = 'INSERT INTO order_menu (order_order_no, menu_menu_no, order_menu_price, order_menu_count) VALUES (?, ?, ?, ?)';
              await pool.query(insertOrderMenuQuery, [orderId, cartItem.menu_menu_no, orderMenuPrice, cart_menu_count]);
            }
    
            // 주문 결제 방법을 업데이트하는 쿼리
            const paymentMethod = req.body.paymentMethod;
            const updateOrderQuery = 'UPDATE `order` SET order_pay = ? WHERE order_no = ?';
            await pool.query(updateOrderQuery, [paymentMethod, orderId]);
    
            // 장바구니 메뉴 정보 삭제하는 쿼리
            const deleteCartMenuQuery = 'DELETE FROM cart_menu WHERE cart_cart_no = ?';
            await pool.query(deleteCartMenuQuery, [cartId]);
    
            // 장바구니 정보 삭제하는 쿼리
            const deleteCartQuery = 'DELETE FROM cart WHERE cart_no = ?';
            await pool.query(deleteCartQuery, [cartId]);
    
            // 주문 완료 페이지로 리다이렉트
            res.redirect('/order_finish');
          } else {
            // 사용자 정보를 찾을 수 없을 때
            res.status(400).send('사용자 정보를 찾을 수 없습니다.');
          }
        } else {
          // 장바구니가 비어있을 때
          res.status(400).send('주문할 항목이 없습니다.');
        }
      } catch (error) {
        // 예외 발생 시 오류 처리
        console.error('주문 처리 중 오류 발생: ', error);
        res.status(500).send('주문 처리 중 오류가 발생했습니다.');
      }
    },
    
  
  supply_reg: async (req, res) => {
    const supName = req.body.supName;
    const supAdd = req.body.supAdd;

    // 공급업체 등록 SQL 실행
    const insertSupplierQuery = 'INSERT INTO suppliers (sup_name, sup_add) VALUES (?, ?)';
    await pool.query(insertSupplierQuery, [supName, supAdd]);

    // 등록 후 공급업체 목록 페이지로 리다이렉트
    res.redirect('/supply_list');
  },
  mat_reg: async (req, res) => {
    try {
        const { matName, matUnit, matSheep } = req.body;

        // MySQL query to insert the material request into the database
        const insertQuery = 'INSERT INTO material (mat_name, mat_unit, mat_sheep) VALUES (?, ?, ?)';
        
        // Execute the query using MySQL2's promise
        const [results] = await pool.execute(insertQuery, [matName, matUnit, matSheep]);

        console.log('Material request submitted successfully.');
        res.redirect('/'); // 재료를 등록한 후 홈 화면으로 리디렉션
    } catch (error) {
        console.error('Error submitting material request:', error);
        res.status(500).send('Internal Server Error');
    }
},
}

const menuDetail = async (req, res) => {
    const menuId = req.params.menuId; // URL에서 메뉴 ID 가져오기
    const q = 'SELECT * FROM menu WHERE menu_no = ?';

    await pool.query(q, [menuId])
    .then((result) => {
        if (result[0].length > 0) {
        res.render('menu_detail', { menuData: result[0][0] });
        }
    });
};

module.exports = {
    output,
    input,
    menuDetail
};