import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  CircleStackIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import apiClient from '../../api/client'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'

interface TableInfo {
  name: string
  row_count: number
}

interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  default: string | null
}

interface TableData {
  table: string
  columns: string[]
  data: Record<string, any>[]
  total: number
  page: number
  pages: number
}

interface DbStats {
  tables: Record<string, number>
  total_rows: number
  database_size: string | null
}

export default function DatabaseManagement() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [tableStructure, setTableStructure] = useState<ColumnInfo[]>([])
  const [stats, setStats] = useState<DbStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  
  // Edit modal
  const [editRow, setEditRow] = useState<Record<string, any> | null>(null)
  const [editData, setEditData] = useState<Record<string, any>>({})
  
  // SQL Query
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResult, setQueryResult] = useState<any>(null)
  const [queryLoading, setQueryLoading] = useState(false)

  // Fetch tables list
  useEffect(() => {
    fetchTables()
    fetchStats()
  }, [])

  // Fetch table data when selected
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, page)
      fetchTableStructure(selectedTable)
    }
  }, [selectedTable, page])

  const fetchTables = async () => {
    try {
      const response = await apiClient.get('/database/tables')
      setTables(response.data.tables)
    } catch (error) {
      toast.error('Ошибка загрузки таблиц')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/database/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }

  const fetchTableData = async (tableName: string, pageNum: number) => {
    try {
      const response = await apiClient.get(`/database/tables/${tableName}`, {
        params: { page: pageNum, limit: 20 }
      })
      setTableData(response.data)
    } catch (error) {
      toast.error('Ошибка загрузки данных таблицы')
    }
  }

  const fetchTableStructure = async (tableName: string) => {
    try {
      const response = await apiClient.get(`/database/tables/${tableName}/structure`)
      setTableStructure(response.data.columns)
    } catch (error) {
      console.error('Failed to fetch structure')
    }
  }

  const handleBackup = async () => {
    try {
      const response = await apiClient.get('/database/backup', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `eurobot_backup_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('Резервная копия создана!')
    } catch (error) {
      toast.error('Ошибка создания резервной копии')
    }
  }

  const handleUpdateRow = async () => {
    if (!selectedTable || !editRow) return
    
    try {
      await apiClient.put(`/database/tables/${selectedTable}/${editRow.id}`, editData)
      toast.success('Запись обновлена')
      setEditRow(null)
      fetchTableData(selectedTable, page)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления')
    }
  }

  const handleDeleteRow = async (rowId: number) => {
    if (!selectedTable) return
    if (!confirm('Удалить эту запись? Это действие необратимо!')) return
    
    try {
      await apiClient.delete(`/database/tables/${selectedTable}/${rowId}`)
      toast.success('Запись удалена')
      fetchTableData(selectedTable, page)
      fetchStats()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return
    
    setQueryLoading(true)
    try {
      const response = await apiClient.post('/database/query', { query: sqlQuery })
      setQueryResult(response.data)
      toast.success(`Найдено записей: ${response.data.row_count}`)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка выполнения запроса')
      setQueryResult(null)
    } finally {
      setQueryLoading(false)
    }
  }

  const openEditModal = (row: Record<string, any>) => {
    setEditRow(row)
    setEditData({ ...row })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление базой данных</h1>
          <p className="text-gray-500">Просмотр и редактирование данных PostgreSQL</p>
        </div>
        <Button onClick={handleBackup} leftIcon={<ArrowDownTrayIcon className="w-5 h-5" />}>
          Создать резервную копию
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CircleStackIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Размер БД</p>
                <p className="text-xl font-bold">{stats.database_size || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TableCellsIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Всего таблиц</p>
                <p className="text-xl font-bold">{tables.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TableCellsIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Всего записей</p>
                <p className="text-xl font-bold">{stats.total_rows.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tables List */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Таблицы</h2>
          <div className="space-y-1">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => {
                  setSelectedTable(table.name)
                  setPage(1)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedTable === table.name
                    ? 'bg-eurobot-blue text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{table.name}</span>
                  <span className={`text-xs ${selectedTable === table.name ? 'text-blue-200' : 'text-gray-400'}`}>
                    {table.row_count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Table Data */}
        <div className="lg:col-span-3 space-y-4">
          {selectedTable && tableData ? (
            <>
              {/* Table Structure */}
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Структура таблицы: {selectedTable}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tableStructure.map((col) => (
                    <span
                      key={col.name}
                      className="px-2 py-1 bg-gray-100 rounded text-xs"
                      title={`${col.type}${col.nullable ? ', nullable' : ''}`}
                    >
                      <span className="font-medium">{col.name}</span>
                      <span className="text-gray-400 ml-1">({col.type})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {tableData.columns.map((col) => (
                          <th key={col} className="px-4 py-3 text-left font-medium text-gray-600">
                            {col}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right font-medium text-gray-600">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {tableData.data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {tableData.columns.map((col) => (
                            <td key={col} className="px-4 py-3 max-w-xs truncate">
                              {row[col] !== null ? String(row[col]).slice(0, 100) : 
                                <span className="text-gray-400">null</span>
                              }
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => openEditModal(row)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {tableData.pages > 1 && (
                  <div className="px-4 py-3 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Страница {tableData.page} из {tableData.pages} (всего {tableData.total})
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(p => Math.min(tableData.pages, p + 1))}
                        disabled={page === tableData.pages}
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <TableCellsIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Выберите таблицу для просмотра данных</p>
            </div>
          )}

          {/* SQL Query */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
              SQL запрос (только SELECT)
            </h3>
            <div className="space-y-3">
              <Textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM users WHERE role = 'SUPER_ADMIN'"
                rows={3}
                className="font-mono text-sm"
              />
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleExecuteQuery}
                  isLoading={queryLoading}
                  leftIcon={<PlayIcon className="w-4 h-4" />}
                >
                  Выполнить
                </Button>
                <span className="text-xs text-gray-400">
                  Разрешены только SELECT запросы для безопасности
                </span>
              </div>
            </div>

            {queryResult && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      {queryResult.columns.map((col: string) => (
                        <th key={col} className="px-3 py-2 text-left border">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.data.map((row: any, idx: number) => (
                      <tr key={idx}>
                        {queryResult.columns.map((col: string) => (
                          <td key={col} className="px-3 py-2 border max-w-xs truncate">
                            {row[col] !== null ? String(row[col]).slice(0, 50) : 'null'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-sm text-gray-500 mt-2">
                  Найдено записей: {queryResult.row_count}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                Редактирование записи #{editRow.id}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(editData).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key}
                  </label>
                  {key === 'id' ? (
                    <Input value={String(value)} disabled />
                  ) : typeof value === 'boolean' ? (
                    <select
                      value={String(value)}
                      onChange={(e) => setEditData({ ...editData, [key]: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : String(value).length > 100 ? (
                    <Textarea
                      value={String(value ?? '')}
                      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                      rows={4}
                    />
                  ) : (
                    <Input
                      value={String(value ?? '')}
                      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setEditRow(null)}>
                Отмена
              </Button>
              <Button onClick={handleUpdateRow}>
                Сохранить
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-yellow-800">Внимание!</h4>
          <p className="text-sm text-yellow-700">
            Прямое редактирование базы данных может привести к потере данных или нарушению работы сайта.
            Всегда создавайте резервную копию перед внесением изменений.
          </p>
        </div>
      </div>
    </div>
  )
}

