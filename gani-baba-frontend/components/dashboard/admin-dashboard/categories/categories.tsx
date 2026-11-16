'use client'

// Dashboard → Categories
// Simple list with just a name.
import React, { useCallback, useEffect, useState } from 'react'
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
import { DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit, Trash2 } from 'lucide-react'
import type { GetCategoryType } from '@/utils/type'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '@/utils/api'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import { useAtom } from 'jotai'
import { Popup } from '@/utils/popup'
import { toast } from '@/hooks/use-toast'
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

type Row = { id: number; name: string }

const Categories = () => {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)

  const [rows, setRows] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [name, setName] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [idToDelete, setIdToDelete] = useState<number | null>(null)

  const loadRows = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetchCategories(token)
      const list: GetCategoryType[] = res.data ?? []
      setRows(list.map((c) => ({ id: c.categoryId as number, name: c.name })))
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const resetForm = useCallback(() => {
    setName('')
    setEditing(null)
    setIsPopupOpen(false)
  }, [])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setIsPopupOpen(true)
  }

  const handleEdit = (row: Row) => {
    setEditing(row)
    setName(row.name)
    setIsPopupOpen(true)
  }

  const handleDeleteClick = (id: number) => {
    setIdToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!token || !idToDelete) return
    try {
      setIsLoading(true)
      await deleteCategory(idToDelete, token)
      await loadRows()
      setDeleteDialogOpen(false)
      setIdToDelete(null)
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: `Could not delete category. It may still have products.`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name: name.trim() }
    if (!payload.name) return

    try {
      setIsSubmitting(true)
      if (editing) await updateCategory(token, editing.id, payload)
      else await createCategory(token, payload)
      await loadRows()
      resetForm()
    } catch (error) {
      console.error('Error saving category:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: `Failed to save category.`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-md text-white">
            <Plus />
          </div>
          <h2 className="text-lg font-semibold">Categories</h2>
        </div>
        <Button onClick={openCreate}>Add Category</Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-primary-100">
            <TableRow>
              <TableHead className="w-20">Sl No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-40">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(row)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(row.id)}
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

      {/* Add / Edit dialog */}
      <Popup
        isOpen={isPopupOpen}
        onClose={resetForm}
        title={editing ? 'Edit Category' : 'Add Category'}
        size="sm:max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name*</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Commode"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editing
                  ? 'Update Category'
                  : 'Save Category'}
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
              category from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIdToDelete(null)}>
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

export default Categories