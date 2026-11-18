import { Router } from 'express'
import { completeOrderController, confirmOrderController, createOrderController, deleteOrderController, getAllOrdersController, getOrdersByUserIdController } from '../controllers/order.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

router.post('/create', authenticateUser, createOrderController)
router.get('/getAll', authenticateUser, getAllOrdersController)
router.get('/getByUserId/:userId', authenticateUser, getOrdersByUserIdController)
router.delete('/delete-order/:orderMasterId', authenticateUser, deleteOrderController)
router.patch('/confirm-order/:id', authenticateUser, confirmOrderController)
router.patch('/complete-order/:id', authenticateUser, completeOrderController)


export default router
