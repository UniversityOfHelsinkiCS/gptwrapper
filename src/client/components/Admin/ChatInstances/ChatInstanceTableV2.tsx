import * as React from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import { Button } from '@mui/material'
import TableRow from '@mui/material/TableRow'
import { useQuery } from '@tanstack/react-query'
import Paper from '@mui/material/Paper'
import { ChatInstance } from '../../../types'
import useChatInstances from './useChatInstances'
import apiClient from '../../../util/apiClient'

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

const useChatInstanceCount = () => {
  const queryKey = ['chatInstances', 'count']
  const queryFn = async () => {
    const res = await apiClient.get('/chatinstances/count')

    return res.data
  }

  const { data: chatInstanceCount, ...rest } = useQuery({ queryKey, queryFn })

  return { chatInstanceCount, ...rest }
}

const ChatInstanceTableV2 = ({
  onSelect,
  onDelete,
}: {
  onSelect: (chatInstance: ChatInstance) => void
  onDelete: (id: string) => void
}) => {
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const { chatInstances } = useChatInstances({
    offset: page * rowsPerPage,
    limit: rowsPerPage,
  })
  const { chatInstanceCount } = useChatInstanceCount()

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex' }}>
          <TablePagination
            rowsPerPageOptions={[10, 50, 100]}
            component="div"
            count={chatInstanceCount || -1}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
            <Head />
            <TableBody>
              {chatInstances.map((row) => (
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
      </Paper>
    </Box>
  )
}

export default ChatInstanceTableV2
