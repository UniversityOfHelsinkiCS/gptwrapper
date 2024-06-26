import * as React from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import { Button, TextField } from '@mui/material'
import TableRow from '@mui/material/TableRow'
import { debounce } from 'lodash'
import Paper from '@mui/material/Paper'
import { ChatInstance } from '../../../types'
import useChatInstances from './useChatInstances'

interface HeadCell {
  disablePadding: boolean
  id: keyof ChatInstance
  label: string
  numeric: boolean
}

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
    id: 'courseId',
    numeric: true,
    disablePadding: false,
    label: 'CourseId',
  },
]

const Head = () => (
  <TableHead>
    <TableRow>
      {headCells.map((headCell) => (
        <TableCell
          key={headCell.id}
          align={headCell.numeric ? 'right' : 'left'}
          padding={headCell.disablePadding ? 'none' : 'normal'}
          sx={{ pl: 1 }}
        >
          {headCell.label}
        </TableCell>
      ))}
    </TableRow>
  </TableHead>
)

const ChatInstanceTableData = React.memo(
  ({
    rows,
    onSelect,
    onDelete,
  }: {
    rows: ChatInstance[]
    onSelect: (chatInstance: ChatInstance) => void
    onDelete: (id: string) => void
  }) => (
    <TableContainer>
      <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
        <Head />
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
                {row.name}
              </TableCell>
              <TableCell align="right">{row.description}</TableCell>
              <TableCell align="right">{row.model}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                {row.usageLimit}
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }} align="right">
                {row.courseId}
              </TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  onClick={() => onSelect(row)}
                >
                  Edit
                </Button>
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => onDelete(row.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
)

const ChatInstanceTableV2 = ({
  onSelect,
  onDelete,
}: {
  onSelect: (chatInstance: ChatInstance) => void
  onDelete: (id: string) => void
}) => {
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  const { chatInstances, count } = useChatInstances({
    offset: page * rowsPerPage,
    limit: rowsPerPage,
    search: deferredSearch,
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

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            label="Search course (input at least 4 characters)"
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
          />
        </Box>
        <ChatInstanceTableData
          rows={chatInstances}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      </Paper>
    </Box>
  )
}

export default ChatInstanceTableV2
