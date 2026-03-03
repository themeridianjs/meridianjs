import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../client"

export interface WorkingDays {
  mon: boolean
  tue: boolean
  wed: boolean
  thu: boolean
  fri: boolean
  sat: boolean
  sun: boolean
}

export interface OrgCalendar {
  working_days: WorkingDays | null
  timezone: string | null
}

export interface OrgHoliday {
  id: string
  name: string
  date: string
  recurring: boolean
}

const DEFAULT_WORKING_DAYS: WorkingDays = {
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: false,
  sun: false,
}

export function useOrgCalendar() {
  return useQuery({
    queryKey: ["org", "calendar"],
    queryFn: () => api.get<OrgCalendar>("/admin/org/calendar"),
    select: (data) => ({
      working_days: data.working_days ?? DEFAULT_WORKING_DAYS,
      timezone: data.timezone,
    }),
  })
}

export function useUpdateOrgCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { working_days?: WorkingDays; timezone?: string | null }) =>
      api.put<OrgCalendar>("/admin/org/calendar", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "calendar"] })
    },
  })
}

export function useHolidays(year?: number) {
  const y = year ?? new Date().getFullYear()
  return useQuery({
    queryKey: ["org", "holidays", y],
    queryFn: () => api.get<{ holidays: OrgHoliday[]; count: number }>(`/admin/org/holidays?year=${y}`),
    select: (data) => data.holidays,
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; date: string; recurring: boolean }) =>
      api.post<{ holiday: OrgHoliday }>("/admin/org/holidays", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "holidays"] })
    },
  })
}

export function useUpdateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; date?: string; recurring?: boolean }) =>
      api.put<{ holiday: OrgHoliday }>(`/admin/org/holidays/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "holidays"] })
    },
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/org/holidays/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "holidays"] })
    },
  })
}
