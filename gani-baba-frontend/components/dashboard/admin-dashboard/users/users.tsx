'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  ArrowUpDown,
  Search,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import { useAtom } from 'jotai'
import { tokenAtom, useInitializeUser } from '@/utils/user'
import { toast } from '@/hooks/use-toast'
import type { GetUsersType } from '@/utils/type'
import {
  getUsers,
  deleteUser,
  updateUserStatus,
  updateUserRole,
} from '@/utils/api'

type SortColumn = 'username' | 'phone' | 'roleName' | 'active'
type SortDirection = 'asc' | 'desc'

const Users = () => {
  useInitializeUser()
  const [token] = useAtom(tokenAtom)

  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<GetUsersType[]>([])

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<number | null>(null)

  // Role switch confirmation dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [userToSwitchRole, setUserToSwitchRole] = useState<{
    userId: number
    currentRoleId: number
    newRoleId: number
    username: string
  } | null>(null)

  // Sorting, searching, and pagination state
  const [sortColumn, setSortColumn] = useState<SortColumn>('username')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch users data using your custom api.ts wrapper
  const fetchUsersData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await getUsers(token)

      if (response?.error?.status !== 401) {
        const responseData: unknown = Array.isArray(response)
          ? response
          : response?.data
        const usersData: GetUsersType[] = Array.isArray(responseData)
          ? responseData
          : responseData &&
              typeof responseData === 'object' &&
              'data' in responseData &&
              Array.isArray(responseData.data)
            ? (responseData.data as GetUsersType[])
            : []
        setUsers(usersData)
      } else {
        toast({
          title: 'Unauthorized',
          variant: 'destructive',
          description: 'Please login again.',
        })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Failed to load users.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchUsersData()
  }, [fetchUsersData])

  // Handle Delete
  const handleDeleteClick = (userId: number) => {
    setUserToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!token || !userToDelete) return
    try {
      setIsLoading(true)
      await deleteUser(token, userToDelete)
      await fetchUsersData()
      toast({ title: 'Success', description: 'User deleted successfully.' })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Failed to delete user.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Status Toggle
  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    if (!token) return
    try {
      await updateUserStatus(token, userId, !currentStatus)
      await fetchUsersData()
      toast({
        title: 'Success',
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      })
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Failed to update user status.',
      })
    }
  }

  // Handle Role Switch (trigger dialog)
  const handleRoleClick = (user: GetUsersType) => {
    if (user.userId === undefined) return
    const currentRoleId = user.roleId || 2 // Default to User (2) if null
    const newRoleId = currentRoleId === 1 ? 2 : 1 // Switch to User (2) or Admin (1)

    setUserToSwitchRole({
      userId: user.userId,
      currentRoleId,
      newRoleId,
      username: user.username,
    })
    setRoleDialogOpen(true)
  }

  const handleRoleConfirm = async () => {
    if (!token || !userToSwitchRole) return
    try {
      setIsLoading(true)
      await updateUserRole(
        token,
        userToSwitchRole.userId,
        userToSwitchRole.newRoleId
      )
      await fetchUsersData()

      toast({
        title: 'Success',
        description: `User role updated successfully.`,
      })
      setRoleDialogOpen(false)
      setUserToSwitchRole(null)
    } catch (error) {
      console.error('Error switching role:', error)
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Failed to update user role.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtering
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    const q = searchTerm.toLowerCase()
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.roleName?.toLowerCase().includes(q)
    )
  }, [users, searchTerm])

  // Sorting
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers]
    sorted.sort((a, b) => {
      if (sortColumn === 'active') {
        const diff = Number(a.active) - Number(b.active)
        return sortDirection === 'asc' ? diff : -diff
      }
      const cmp = String(a[sortColumn] || '').localeCompare(
        String(b[sortColumn] || '')
      )
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredUsers, sortColumn, sortDirection])

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedUsers, currentPage])

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)

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
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary p-2 rounded-md text-white">
              <ShieldCheck />
            </div>
            <h2 className="text-lg font-semibold">Users Management</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary-100">
              <TableRow>
                <TableHead>Sl No</TableHead>
                <SortHead column="username">Username</SortHead>
                <SortHead column="phone">Phone</SortHead>
                <SortHead column="roleName">Role</SortHead>
                <SortHead column="active">Status</SortHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user, index) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{user.username}</div>
                      {user.fullName && (
                        <div className="text-sm text-muted-foreground">
                          {user.fullName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{user.phone}</TableCell>

                    {/* Plain Text Role */}
                    <TableCell className="font-medium capitalize">
                      {user.roleName || '-'}
                    </TableCell>

                    {/* Active Status Badge */}
                    <TableCell>
                      {user.active ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm whitespace-nowrap">
                          Active
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm whitespace-nowrap">
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="space-x-2 whitespace-nowrap">
                      {/* 1. Switch Role Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleClick(user)}
                            className="text-blue-600"
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Switch Role</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* 2. Switch Status Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (user.userId === undefined) return
                              handleToggleStatus(user.userId, user.active)
                            }}
                            className={
                              user.active ? 'text-yellow-600' : 'text-green-600'
                            }
                          >
                            {user.active ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {user.active ? 'Deactivate User' : 'Activate User'}
                          </p>
                        </TooltipContent>
                      </Tooltip>

                      {/* 3. Delete Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (user.userId === undefined) return
                              handleDeleteClick(user.userId)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete User</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {sortedUsers.length > 0 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    className={
                      currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, index) => {
                  if (
                    index === 0 ||
                    index === totalPages - 1 ||
                    (index >= currentPage - 2 && index <= currentPage + 2)
                  ) {
                    return (
                      <PaginationItem key={`page-${index}`}>
                        <PaginationLink
                          onClick={() => setCurrentPage(index + 1)}
                          isActive={currentPage === index + 1}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  } else if (
                    index === currentPage - 3 ||
                    index === currentPage + 3
                  ) {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationLink>...</PaginationLink>
                      </PaginationItem>
                    )
                  }
                  return null
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                user from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>
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

        {/* Role Switch Confirmation Dialog */}
        <AlertDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Switch User Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to change the role of{' '}
                <strong>{userToSwitchRole?.username}</strong> from{' '}
                <strong>
                  {userToSwitchRole?.currentRoleId === 1 ? 'Admin' : 'User'}
                </strong>{' '}
                to{' '}
                <strong>
                  {userToSwitchRole?.newRoleId === 1 ? 'Admin' : 'User'}
                </strong>
                ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToSwitchRole(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRoleConfirm}
                className="bg-primary hover:bg-primary/90"
              >
                Confirm Switch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

export default Users
