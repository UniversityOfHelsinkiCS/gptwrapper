import React from 'react'
import { Box, Tab, Tabs, Typography, Container } from '@mui/material'
import { useTranslation } from 'react-i18next'
import useUserCourses, { CoursesViewCourse } from '../../hooks/useUserCourses'
import { useMemo, useState } from 'react'
import TableSortLabel from '@mui/material/TableSortLabel'

// import CourseList from '../Courses/CourseList'
import { formatDate, getGroupedCourses } from './util'
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { BlueButton, GrayButton, GreenButton, OutlineButtonBlack } from './general/Buttons'


interface TabPanelProps {
    children?: React.ReactNode
    index: number
    value: number
}

const CustomTabPanel = (props: TabPanelProps) => {
    const { children, value, index } = props

    return (
        <Box role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 1 }} >{children}</Box>}
        </Box>
    )
}

const CoursesModal = () => {
    const { t } = useTranslation()
    const { courses, isLoading } = useUserCourses()

    const [value, setValue] = React.useState(0)

    if (!courses || isLoading) return null

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue)
    }

    const { curreEnabled, ended } = getGroupedCourses(courses)

    const activeCourses = courses.filter((course) => !course.isExpired)

    return (
        <Box>
            <Tabs value={value} onChange={handleChange}>
                {/* <Tab label={t('course:activeTab')} />
                <Tab label={t('course:curreEnabledTab')} />
                <Tab label={t('course:endedTab')} /> */}
                <Tab label={t('course:activeTab')} />
                {/* <Tab label={t('course:curreEnabledTab')} /> */}
                <Tab label="Aktivoimatta" />
                <Tab label="Menneet kurssit" />
            </Tabs>
            <CustomTabPanel value={value} index={0}>
                <CourseList courseUnits={activeCourses} type="active" />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <CourseList courseUnits={curreEnabled} type="inactive" />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
                <CourseList courseUnits={ended} type="ended" />
            </CustomTabPanel>
        </Box>
    )
}


type Order = 'asc' | 'desc'
type OrderBy = 'name' | 'courseId' | 'startDate'

const CourseList = ({ courseUnits, type }: { courseUnits: CoursesViewCourse[], type: "active" | "inactive" | "ended" }) => {
    const { t, i18n } = useTranslation()
    const { language } = i18n

    const [order, setOrder] = useState<Order>('asc')
    const [orderBy, setOrderBy] = useState<OrderBy>('name')

    const handleRequestSort = (property: OrderBy) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    const sorted = useMemo(() => {
        const compare = (a: CoursesViewCourse, b: CoursesViewCourse) => {
            let av: string | number = ''
            let bv: string | number = ''
            if (orderBy === 'name') {
                av = a.name[language] || ''
                bv = b.name[language] || ''
            } else if (orderBy === 'courseId') {
                av = a.courseId || ''
                bv = b.courseId || ''
            } else {
                av = new Date(a.activityPeriod.startDate).getTime()
                bv = new Date(b.activityPeriod.startDate).getTime()
            }
            if (av < bv) return order === 'asc' ? -1 : 1
            if (av > bv) return order === 'asc' ? 1 : -1
            return 0
        }
        return [...courseUnits].sort(compare)
    }, [courseUnits, order, orderBy, language])

    return (
        <Box sx={{ py: 2, overflow: 'auto' }}>
            <TableContainer sx={{ borderRadius: 1, minWidth: 800 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                <TableSortLabel
                                    active={orderBy === 'name'}
                                    direction={orderBy === 'name' ? order : 'asc'}
                                    onClick={() => handleRequestSort('name')}
                                >
                                    Nimi
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                <TableSortLabel
                                    active={orderBy === 'courseId'}
                                    direction={orderBy === 'courseId' ? order : 'asc'}
                                    onClick={() => handleRequestSort('courseId')}
                                >
                                    Koodi
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                <TableSortLabel
                                    active={orderBy === 'startDate'}
                                    direction={orderBy === 'startDate' ? order : 'asc'}
                                    onClick={() => handleRequestSort('startDate')}
                                >
                                    Aika
                                </TableSortLabel>
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {sorted.map((course) => (
                            <TableRow key={course.courseId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                                    {course.name[language]}
                                </TableCell>
                                <TableCell align="right">{course.courseUnits[0]?.code ?? '--'}</TableCell>
                                <TableCell align="right">{formatDate(course.activityPeriod)}</TableCell>
                                <TableCell align="right" sx={{ width: 0 }}>
                                    <Box sx={{ display: 'inline-flex', gap: 2, pl: '2rem' }}>
                                        {type === 'ended' && (
                                            <Box component="span" sx={{ color: 'error.main', whiteSpace: 'nowrap' }}>
                                                Kurssi on päättynyt
                                            </Box>
                                        )}
                                        {type !== 'ended' && (
                                            <>
                                                <OutlineButtonBlack size="small" endIcon={<OpenInNewIcon />}>
                                                    Kurssisivulle
                                                </OutlineButtonBlack>
                                                {type === 'active' ? (
                                                    <BlueButton size="small" endIcon={<EditIcon />}>Muokkaa</BlueButton>
                                                ) : (
                                                    <GreenButton size="small" endIcon={<EditIcon />}>Aktivoi</GreenButton>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
}



export default CoursesModal
