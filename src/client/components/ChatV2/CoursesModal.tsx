import React from 'react'
import { Box, Tab, Tabs, Typography, Container } from '@mui/material'
import { useTranslation } from 'react-i18next'
import useUserCourses, { CoursesViewCourse } from '../../hooks/useUserCourses'
// import CourseList from '../Courses/CourseList'
import { getGroupedCourses } from './util'
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



const CourseList = ({ courseUnits, type }: { courseUnits: CoursesViewCourse[], type: "active" | "inactive" | "ended" }) => {
    const { t, i18n } = useTranslation()
    const { language } = i18n

    return (
        <Box sx={{ py: 2, overflowX: 'auto' }}>
            <TableContainer sx={{ borderRadius: 1, minWidth: 800 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nimi</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Koodi</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Aika</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {courseUnits.map((course) => (
                            <TableRow key={course.courseId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                                    {course.name[language]}
                                </TableCell>
                                <TableCell align="right">{course.courseId}</TableCell>
                                <TableCell align="right">{course.activityPeriod.startDate}</TableCell>
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
