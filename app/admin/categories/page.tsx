import { listAdminCategories } from '@/lib/admin/queries'
import { AdminPageHeader } from '@/components/admin/ui'
import { CategoryManager } from '@/components/admin/CategoryManager'

export const metadata = { title: 'Categories · Admin' }

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories()
  return (
    <>
      <AdminPageHeader title="Categories" subtitle="Add, rename, hide, and reorder" />
      <CategoryManager categories={categories} />
    </>
  )
}
