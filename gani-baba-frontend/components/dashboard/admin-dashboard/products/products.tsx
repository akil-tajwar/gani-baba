'use client'

import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, ArrowUpDown, Search, Edit, X } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type {
  CreateProductType,
  GetBrandType,
  GetCategoryType,
  GetProductType,
} from '@/utils/type'
import {
  createProduct,
  fetchBrands,
  fetchCategories,
  fetchProducts,
  updateProduct,
  deleteProduct,
} from '@/utils/api'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import { useAtom } from 'jotai'
import { Popup } from '@/utils/popup'
import { CustomCombobox } from '@/utils/custom-combobox'
import { toast } from '@/hooks/use-toast'
import Image from 'next/image'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'

type SortColumn =
  | 'productCode'
  | 'name'
  | 'brandName'
  | 'categoryName'
  | 'price'
  | 'discount'
  | 'isAvailable'
type SortDirection = 'asc' | 'desc'

const emptyProduct = (): CreateProductType => ({
  productCode: '',
  name: '',
  description: '',
  price: 0,
  discount: 0,
  categoryId: 0,
  brandId: null, // <-- Changed to null
  isAvailable: true,
})

const Products = () => {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)

  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [categories, setCategories] = useState<GetCategoryType[]>([])
  const [brands, setBrands] = useState<GetBrandType[]>([])

  const [editingProduct, setEditingProduct] = useState<GetProductType | null>(
    null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<number | null>(null)

  // Sorting, searching, and pagination state
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Form state
  const [formData, setFormData] = useState<CreateProductType>(emptyProduct())

  // Single product photo (backend field: photoFile)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')

  const [products, setProducts] = useState<GetProductType[]>([])

  const fetchLookups = useCallback(async () => {
    if (!token) return
    try {
      const [catRes, brandRes] = await Promise.all([
        fetchCategories(token),
        fetchBrands(token),
      ])
      setCategories(catRes.data ?? [])
      setBrands(brandRes.data ?? [])
    } catch (error) {
      console.error('Error fetching categories/brands:', error)
    }
  }, [token])

  useEffect(() => {
    fetchLookups()
  }, [fetchLookups])

  const fetchProductsData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await fetchProducts(token)
      if (response?.error?.status !== 401) {
        setProducts(response.data ?? [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchProductsData()
  }, [fetchProductsData])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'price' || name === 'discount') {
      setFormData((prev) => ({
        ...prev,
        [name]: Math.round(Number(value)) || 0,
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleRemovePhoto = () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview('')
  }

  const resetForm = useCallback(() => {
    setFormData(emptyProduct())
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview('')
    setEditingProduct(null)
    setIsPopupOpen(false)
  }, [photoPreview])

  const handleEdit = useCallback((product: GetProductType) => {
    setEditingProduct(product)
    setFormData({
      productId: product.productId,
      productCode: product.productCode || '',
      name: product.name,
      description: product.description || '',
      price: product.price,
      discount: product.discount ?? 0,
      categoryId: product.categoryId,
      brandId: product.brandId ?? null, // <-- Handle null from DB
      isAvailable: product.isAvailable ?? true,
    })
    setPhotoFile(null)
    setPhotoPreview(product.photoUrl || '')
    setIsPopupOpen(true)
  }, [])

  const handleDeleteClick = (productId: number) => {
    setProductToDelete(productId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!token || !productToDelete) return
    try {
      setIsLoading(true)
      await deleteProduct(token, productToDelete)
      await fetchProductsData()
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!token) return

      // Only category is required now
      if (!formData.categoryId) {
        toast({
          title: 'Missing fields',
          variant: 'destructive',
          description: 'Please select a category.',
        })
        return
      }
      if (!editingProduct && !photoFile) {
        toast({
          title: 'Photo required',
          variant: 'destructive',
          description: 'Please select a product photo.',
        })
        return
      }

      try {
        setIsSubmitting(true)

        const productPayload = {
          productCode: formData.productCode || undefined,
          name: formData.name,
          description: formData.description || null,
          price: formData.price,
          discount: formData.discount,
          categoryId: formData.categoryId,
          brandId: formData.brandId || null, // <-- Send null if not selected
          isAvailable: formData.isAvailable,
        }

        const form = new FormData()
        form.append('product', JSON.stringify(productPayload))
        if (photoFile) form.append('photo', photoFile)

        if (editingProduct?.productId !== undefined) {
          await updateProduct(token, editingProduct.productId, form)
        } else {
          await createProduct(token, form)
        }

        await fetchProductsData()
        resetForm()
      } catch (error) {
        console.error('Error saving product:', error)
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Failed to save product.',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, token, fetchProductsData, resetForm, editingProduct, photoFile]
  )

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    const q = searchTerm.toLowerCase()
    return products.filter(
      (p) =>
        p.productCode?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q) ||
        p.price?.toString().includes(searchTerm) ||
        p.discount?.toString().includes(searchTerm)
    )
  }, [products, searchTerm])

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts]
    sorted.sort((a, b) => {
      if (sortColumn === 'price' || sortColumn === 'discount') {
        const diff = Number(a[sortColumn] ?? 0) - Number(b[sortColumn] ?? 0)
        return sortDirection === 'asc' ? diff : -diff
      }
      if (sortColumn === 'isAvailable') {
        const diff = Number(a.isAvailable) - Number(b.isAvailable)
        return sortDirection === 'asc' ? diff : -diff
      }
      const cmp = String(a[sortColumn] || '').localeCompare(
        String(b[sortColumn] || '')
      )
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredProducts, sortColumn, sortDirection])

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedProducts, currentPage])

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage)

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortHead = ({
    column,
    children,
  }: {
    column: SortColumn
    children: React.ReactNode
  }) => (
    <TableHead onClick={() => handleSort(column)} className="cursor-pointer">
      <div className="flex items-center gap-1">
        <span>{children}</span>
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </TableHead>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-primary p-2 rounded-md text-white">
            <Plus />
          </div>
          <h2 className="text-lg font-semibold">Products</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 w-64"
            />
          </div>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setFormData(emptyProduct())
              setPhotoFile(null)
              setPhotoPreview('')
              setIsPopupOpen(true)
            }}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary-100">
            <TableRow>
              <TableHead>Sl No</TableHead>
              <TableHead>Image</TableHead>
              <SortHead column="productCode">Product Code</SortHead>
              <SortHead column="name">Name</SortHead>
              <SortHead column="brandName">Brand</SortHead>
              <SortHead column="categoryName">Category</SortHead>
              <SortHead column="price">Price</SortHead>
              <SortHead column="discount">Discount</SortHead>
              <SortHead column="isAvailable">Available</SortHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product, index) => (
                <TableRow key={product.productId}>
                  <TableCell>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Link href={`/product-details/${product.productId}`}>
                      <Image
                        src={product.photoUrl || '/placeholder.svg'}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover rounded"
                      />
                    </Link>
                  </TableCell>
                  <TableCell>{product.productCode || '-'}</TableCell>
                  <TableCell>
                    <Link
                      href={`/product-details/${product.productId}`}
                      className="text-primary-800 font-semibold"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>{product.brandName || '-'}</TableCell>
                  <TableCell>{product.categoryName || '-'}</TableCell>
                  <TableCell>৳{product.price}</TableCell>
                  <TableCell>{product.discount ?? 0}%</TableCell>
                  <TableCell>
                    {product.isAvailable ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        Yes
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDeleteClick(product.productId as number)
                      }
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={
                  currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                }
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  onClick={() => setCurrentPage(index + 1)}
                  isActive={currentPage === index + 1}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className={
                  currentPage === totalPages || totalPages === 0
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Add / Edit dialog */}
      <Popup
        isOpen={isPopupOpen}
        onClose={resetForm}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="sm:max-w-2xl"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[70vh] overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">Product Code</Label>
              <Input
                id="productCode"
                name="productCode"
                type="text"
                value={formData.productCode || ''}
                onChange={handleInputChange}
                placeholder="Enter product code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Product Name*</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (৳)*</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Enter price"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                min={0}
                max={100}
                value={formData.discount}
                onChange={handleInputChange}
                placeholder="Enter discount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category*</Label>
              <CustomCombobox
                items={categories
                  .filter((c) => c.categoryId !== undefined)
                  .map((c) => ({
                    id: String(c.categoryId),
                    name: c.name || 'Unnamed item',
                  }))}
                value={
                  formData.categoryId
                    ? {
                        id: String(formData.categoryId),
                        name:
                          categories.find(
                            (c) => c.categoryId === formData.categoryId
                          )?.name || '',
                      }
                    : null
                }
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: value ? Number(value.id) : 0,
                  }))
                }
                placeholder="Select category"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandId">Brand (Optional)</Label>
              <CustomCombobox
                items={brands
                  .filter((b) => b.brandId !== undefined)
                  .map((b) => ({
                    id: String(b.brandId),
                    name: b.name || 'Unnamed item',
                  }))}
                value={
                  formData.brandId
                    ? {
                        id: String(formData.brandId),
                        name:
                          brands.find((b) => b.brandId === formData.brandId)
                            ?.name || '',
                      }
                    : null
                }
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    brandId: value ? Number(value.id) : null, // <-- Handle null
                  }))
                }
                placeholder="Select brand (optional)"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Enter product description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isAvailable"
                name="isAvailable"
                checked={formData.isAvailable}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isAvailable: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="isAvailable" className="cursor-pointer">
                Is Available
              </Label>
            </div>
          </div>

          {/* Photo (one image per product) */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Product Photo*</Label>

            {photoPreview ? (
              <div className="relative w-40 h-40 border rounded-lg overflow-hidden group">
                <Image
                  src={photoPreview}
                  alt="Product photo"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label
                htmlFor="product-image"
                className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-primary-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                {photoPreview ? 'Change Photo' : 'Select Photo'}
              </Label>
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editingProduct
                  ? 'Update Product'
                  : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </Popup>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Products
