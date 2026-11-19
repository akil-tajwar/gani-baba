import { fetchApi, fetchApiWithFile } from '@/utils/http'
import {
  CreateBrandType,
  CreateCategoryType,
  GetBrandType,
  CreateOrderType,
  CreateProductType,
  GetCategoryType,
  GetOrderType,
  GetProductType,
  RegisterRequest,
  RegisterResponse,
  SignInRequest,
  SignInResponse,
  GetUsersType,
  CreateCouponType,
  GetCouponType,
  UserType,
} from '@/utils/type'

export async function registerUser(data: RegisterRequest) {
  return fetchApi<RegisterResponse>({
    url: 'api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

export async function signIn(data: { phone: string; password: string }) {
  return fetchApi<SignInResponse>({
    url: 'api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

export async function getUsers(token: string) {
  return fetchApi<{ status: string; data: UserType[] }>({
    url: 'api/auth/get-users',
    method: 'GET',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  })
}

// ✅ Function to fetch a user by userId
export async function getUserByUserId(token: string, userId: number) {
  return fetchApi<GetUsersType>({
    url: `api/auth/user-by-userId/${userId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
  })
}

// ✅ Update User by userId
export async function updateUser(
  token: string,
  userId: number,
  data: Partial<any> // allow partial updates
) {
  return fetchApi<GetUsersType>({
    url: `api/auth/users/${userId}`, // endpoint
    method: 'PUT', // update method
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
    body: data, // send updated fields
  })
}

// Create a new category
export async function createCategory(token: string, data: CreateCategoryType) {
  return fetchApi<CreateCategoryType>({
    url: 'api/categories/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
    body: data,
  })
}

// ---------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------
export async function createBrand(token: string, data: CreateBrandType) {
  return fetchApi<CreateBrandType>({
    url: 'api/brands/create',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `${token}` },
    body: data,
  })
}

export async function fetchBrands(token: string) {
  return fetchApi<GetBrandType[]>({
    url: 'api/brands/get',
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `${token}` },
  })
}

export async function updateBrand(
  token: string,
  id: number,
  data: Partial<GetBrandType>
) {
  return fetchApi<GetBrandType>({
    url: `api/brands/update/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `${token}` },
    body: data,
  })
}

export async function deleteBrand(id: number, token: string) {
  return fetchApi<{ id: number }>({
    url: `api/brands/delete/${id}`,
    method: 'DELETE',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------
export async function createCoupon(token: string, data: CreateCouponType) {
  return fetchApi<CreateCouponType>({
    url: 'api/coupons/create',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `${token}` },
    body: data,
  })
}

export async function fetchCoupons(token: string) {
  return fetchApi<GetCouponType[]>({
    url: 'api/coupons/get',
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `${token}` },
  })
}

export async function updateCoupon(
  token: string,
  id: number,
  data: Partial<GetCouponType>
) {
  return fetchApi<GetCouponType>({
    url: `api/coupons/update/${id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `${token}` },
    body: data,
  })
}

export async function deleteCoupon(id: number, token: string) {
  return fetchApi<{ id: number }>({
    url: `api/coupons/delete/${id}`,
    method: 'DELETE',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  })
}

//get all Categories api
export async function fetchCategories(token: string) {
  return fetchApi<GetCategoryType[]>({
    url: 'api/categories/get',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
  })
}

// Update Category API
export async function updateCategory(
  token: string,
  id: number,
  data: Partial<GetCategoryType>
) {
  return fetchApi<GetCategoryType>({
    url: `api/categories/update/${id}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
    body: data,
  })
}

export async function deleteCategory(id: number, token: string) {
  return fetchApi<{ id: number }>({
    url: `api/categories/delete/${id}`,
    method: 'DELETE',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
  })
}

// Create a new product
export async function createProduct(token: string, formData: FormData) {
  return fetchApiWithFile<CreateProductType>({
    url: 'api/products/create',
    method: 'POST',
    headers: {
      Authorization: `${token}`,
    },
    body: formData, // Pass FormData directly
  })
}

//get all products api
export async function fetchProducts(token: string) {
  return fetchApi<GetProductType[]>({
    url: 'api/products/get',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
  })
}

// Update product API
export async function updateProduct(
  token: string,
  id: number,
  formData: FormData
) {
  return fetchApiWithFile<CreateProductType>({
    url: `api/products/update/${id}`,
    method: 'PUT',
    headers: {
      Authorization: `${token}`,
    },
    body: formData,
  })
}

//delete product api
export async function deleteProduct(token: string, id: number) {
  return fetchApi<{ id: number }>({
    url: `api/products/delete/${id}`,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
  })
}

//get product by id api
export async function fetchProductById(token: string, id: number) {
  return fetchApi<GetProductType>({
    url: `api/products/get/${id}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
  })
}

export async function createOrder(token: string, formData: CreateOrderType) {
  return fetchApiWithFile<CreateOrderType>({
    url: 'api/orders/create',
    method: 'POST',
    headers: {
      Authorization: `${token}`,
    },
    body: formData, // Pass FormData directly
  })
}

export async function fetchAllOrders(token: string) {
  return fetchApi<GetOrderType[]>({
    url: 'api/orders/getAll',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
  })
}

export async function fetchOrdersByUserId(token: string, userId: number) {
  return fetchApi<GetOrderType>({
    url: `api/orders/getByUserId/${userId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    },
  })
}

export async function confirmOrder(token: string, id: number) {
  return fetchApiWithFile<GetProductType>({
    url: `api/orders/confirm-order/${id}`,
    method: 'PATCH',
    headers: {
      Authorization: `${token}`,
    },
  })
}

export async function completeOrder(token: string, id: number) {
  return fetchApiWithFile<GetProductType>({
    url: `api/orders/complete-order/${id}`,
    method: 'PATCH',
    headers: {
      Authorization: `${token}`,
    },
  })
}

export async function deleteOrder(id: number, token: string) {
  return fetchApi<{ id: number }>({
    url: `api/orders/delete-order/${id}`,
    method: 'DELETE',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
  })
}
