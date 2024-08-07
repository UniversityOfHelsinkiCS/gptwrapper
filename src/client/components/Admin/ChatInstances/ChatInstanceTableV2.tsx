/* eslint-disable import/no-extraneous-dependencies */
import * as React from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import { Button, TextField, Link, TableSortLabel } from '@mui/material'
import TableRow from '@mui/material/TableRow'
import { debounce } from 'lodash'
import Paper from '@mui/material/Paper'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { visuallyHidden } from '@mui/utils'
import { ChatInstance } from '../../../types'
import useChatInstances from './useChatInstances'

interface HeadCell {
  disablePadding: boolean
  id: keyof ChatInstance
  label: string
  numeric: boolean
}

type Order = 'asc' | 'desc'

const headCells: readonly HeadCell[] = [
  {
    id: 'name',
    numeric: false,
    disablePadding: true,
    label: 'Name',
  },
  {
    id: 'description',
    numeric: true,
    disablePadding: false,
    label: 'Description',
  },
  {
    id: 'model',
    numeric: true,
    disablePadding: false,
    label: 'Model',
  },
  {
    id: 'usageLimit',
    numeric: true,
    disablePadding: false,
    label: 'Usagelimit',
  },
  {
    id: 'promptCount',
    numeric: true,
    disablePadding: false,
    label: 'PromptCount',
  },
]

const Head = ({
  onRequestSort,
  order,
  orderBy,
}: {
  onRequestSort: (
    event: React.MouseEvent<unknown>,
    property: keyof ChatInstance
  ) => void
  order: Order
  orderBy: string
}) => {
  /* 
  const { t } = useTranslation() */

  const createSortHandler =
    (property: keyof ChatInstance) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property)
    }

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sx={{ pl: 1 }}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}

const ChatInstanceTableData = React.memo(
  ({
    rows,
    onSelect,
    onDelete,
    order,
    orderBy,
    onRequestSort,
  }: {
    rows: ChatInstance[]
    onSelect: (chatInstance: ChatInstance) => void
    onDelete: (id: string) => void
    order: Order
    orderBy: string
    onRequestSort: (
      event: React.MouseEvent<unknown>,
      property: keyof ChatInstance
    ) => void
  }) => {
    const { t, i18n } = useTranslation()

    const { language } = i18n

    return (
      <TableContainer>
        <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
          <Head order={order} orderBy={orderBy} onRequestSort={onRequestSort} />
          <TableBody>
            {rows.map((row) => (
              <TableRow role="checkbox" key={row.id}>
                <TableCell
                  component="th"
                  scope="row"
                  padding="none"
                  width="40%"
                  sx={{ pl: 1 }}
                >
                  <Link to={`/courses/${row.courseId}`} component={RouterLink}>
                    {row.name[language]}
                  </Link>
                </TableCell>
                <TableCell align="right">{row.description}</TableCell>
                <TableCell align="right">{row.model}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                  {row.usageLimit}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                  {row.promptCount}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    color="primary"
                    onClick={() => onSelect(row)}
                  >
                    {t('common:edit')}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    onClick={() => onDelete(row.id)}
                  >
                    {t('common:delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }
)

const ChatInstanceTableV2 = ({
  onSelect,
  onDelete,
}: {
  onSelect: (chatInstance: ChatInstance) => void
  onDelete: (id: string) => void
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [order, setOrder] = React.useState<Order>('asc')
  const [orderBy, setOrderBy] = React.useState<keyof ChatInstance>('name')

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  const { chatInstances, count } = useChatInstances({
    offset: page * rowsPerPage,
    limit: rowsPerPage,
    search: deferredSearch,
    order,
    orderBy,
  })

  const handleChangePage = React.useCallback(
    (event: unknown, newPage: number) => {
      setPage(newPage)
    },
    []
  )

  const handleChangeRowsPerPage = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10))
      setPage(0)
    },
    []
  )

  const handleChangeSearch = debounce(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSearch = event.target.value
      if (newSearch && newSearch.length < 4) return
      setSearch(newSearch)
    },
    300
  )

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof ChatInstance
  ) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            label={t('admin:searchCourse')}
            variant="outlined"
            sx={{ flex: 1, m: 1 }}
            onChange={handleChangeSearch}
          />
          <TablePagination
            rowsPerPageOptions={[10, 50, 100]}
            component="div"
            count={count || -1}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage={t('admin:rowsPerPage')}
          />
        </Box>
        <ChatInstanceTableData
          rows={chatInstances}
          onSelect={onSelect}
          onDelete={onDelete}
          onRequestSort={handleRequestSort}
          order={order}
          orderBy={orderBy}
        />
      </Paper>
    </Box>
  )
}

export default ChatInstanceTableV2
