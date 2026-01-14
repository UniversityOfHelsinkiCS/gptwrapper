import * as React from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import { TextField, Link, TableSortLabel, Checkbox, InputLabel } from '@mui/material'
import TableRow from '@mui/material/TableRow'
import { debounce } from 'lodash'
import Paper from '@mui/material/Paper'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { visuallyHidden } from '@mui/utils'
import { ActivityPeriod, ChatInstance } from '../../../types'
import useChatInstances from './useChatInstances'

interface ChatInstanceWithTokens extends ChatInstance {
  activityPeriod: ActivityPeriod
  tokenUsage: number
}

interface HeadCell {
  disablePadding: boolean
  id: keyof ChatInstanceWithTokens
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
  {
    id: 'tokenUsage',
    numeric: true,
    disablePadding: false,
    label: 'TokenUsage',
  },
  {
    id: 'activityPeriod',
    numeric: false,
    disablePadding: false,
    label: 'ActivityPeriod',
  },
]

const Head = ({
  onRequestSort,
  order,
  orderBy,
}: {
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof ChatInstanceWithTokens) => void
  order: Order
  orderBy: string
}) => {
  const { t } = useTranslation()

  const createSortHandler = (property: keyof ChatInstanceWithTokens) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property)
  }

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell key={headCell.id} align={headCell.numeric ? 'right' : 'left'} padding={headCell.disablePadding ? 'none' : 'normal'} sx={{ pl: 1 }}>
            <TableSortLabel active={orderBy === headCell.id} direction={orderBy === headCell.id ? order : 'asc'} onClick={createSortHandler(headCell.id)}>
              {t(`admin:${headCell.id}`)}
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

const ChatInstanceTableChatInstanceWithTokens = React.memo(
  ({
    rows,
    order,
    orderBy,
    onRequestSort,
  }: {
    rows: ChatInstanceWithTokens[]
    order: Order
    orderBy: string
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof ChatInstanceWithTokens) => void
  }) => {
    const { i18n } = useTranslation()

    const { language } = i18n

    return (
      <TableContainer>
        <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
          <Head order={order} orderBy={orderBy} onRequestSort={onRequestSort} />
          <TableBody>
            {rows.map((row) => (
              <TableRow role="checkbox" key={row.id}>
                <TableCell component="th" scope="row" padding="none" width="40%" sx={{ pl: 1 }}>
                  <Link to={`/${row.courseId}/course`} component={RouterLink}>
                    {row.name[language]}
                  </Link>
                </TableCell>
                <TableCell align="right">{row.description}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                  {row.usageLimit}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                  {row.promptCount}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                  {row.tokenUsage ?? 0}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                  {row.activityPeriod.startDate}-{row.activityPeriod.endDate}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  },
)

const ChatInstanceTable = () => {
  const { t } = useTranslation()
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [order, setOrder] = React.useState<Order>('asc')
  const [orderBy, setOrderBy] = React.useState<keyof ChatInstanceWithTokens>('name')
  const [showActiveCourses, setShowActiveCourses] = React.useState(false)

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  const { chatInstances, count, isLoading } = useChatInstances({
    offset: page * rowsPerPage,
    limit: rowsPerPage,
    search: deferredSearch,
    order,
    orderBy,
    showActiveCourses,
  })

  const handleChangePage = React.useCallback((event: unknown, newPage: number) => {
    setPage(newPage)
  }, [])

  const handleChangeRowsPerPage = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }, [])

  const handleChangeSearch = debounce((event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = event.target.value
    if (newSearch && newSearch.length < 4) return
    setSearch(newSearch)
  }, 300)

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof ChatInstanceWithTokens) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box>
          <InputLabel>
            <Checkbox checked={showActiveCourses} onChange={() => setShowActiveCourses(!showActiveCourses)} inputProps={{ 'aria-label': 'controlled' }} />

            {t(`course:showActiveCourses`)}
          </InputLabel>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField label={t('admin:searchCourse')} variant="outlined" sx={{ flex: 1, m: 1 }} onChange={handleChangeSearch} />
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
        {!isLoading && <ChatInstanceTableChatInstanceWithTokens rows={chatInstances} onRequestSort={handleRequestSort} order={order} orderBy={orderBy} />}
      </Paper>
    </Box>
  )
}

export default ChatInstanceTable
