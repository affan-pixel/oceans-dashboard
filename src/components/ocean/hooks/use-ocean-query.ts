'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CandidateDTO,
  JobDescriptionDTO,
  MatchDTO,
  LeadDTO,
  IcpConfigDTO,
  DashboardStatsDTO,
  ActivityDTO,
  OutreachStepDTO,
  JobTargetDTO,
  BriefDTO,
  ScrapedJobDTO,
  IntegrationDTO,
} from '@/lib/types'

async function http<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ----- Dashboard -----
export function useDashboard() {
  return useQuery<DashboardStatsDTO>({
    queryKey: ['dashboard'],
    queryFn: () => http<DashboardStatsDTO>('/api/dashboard'),
    refetchInterval: 60_000,
  })
}

// ----- Candidates -----
export function useCandidates() {
  return useQuery<CandidateDTO[]>({
    queryKey: ['candidates'],
    queryFn: () => http<CandidateDTO[]>('/api/candidates'),
  })
}

export function useCandidate(id: string | null) {
  return useQuery<CandidateDTO>({
    queryKey: ['candidate', id],
    queryFn: () => http<CandidateDTO>(`/api/candidates/${id}`),
    enabled: !!id,
  })
}

export function useCreateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CandidateDTO> & { name: string; headline: string; location: string; rawProfile: string }) =>
      http<CandidateDTO>('/api/candidates', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('Candidate created', { description: `${data.name} structured by AI.` })
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to create candidate', { description: err.message }),
  })
}

export function useUpdateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      http<CandidateDTO>(`/api/candidates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('Candidate updated')
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['candidate', data.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to update candidate', { description: err.message }),
  })
}

export function useDeleteCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http(`/api/candidates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Candidate deleted')
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to delete candidate', { description: err.message }),
  })
}

export function useRestructureCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http<CandidateDTO>(`/api/candidates/${id}/restructure`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('Profile re-structured', { description: `Re-analyzed ${data.name}.` })
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['candidate', data.id] })
    },
    onError: (err: Error) => toast.error('Failed to re-structure', { description: err.message }),
  })
}

// ----- JDs -----
export function useJds() {
  return useQuery<JobDescriptionDTO[]>({
    queryKey: ['jds'],
    queryFn: () => http<JobDescriptionDTO[]>('/api/jds'),
  })
}

export function useJd(id: string | null) {
  return useQuery<JobDescriptionDTO>({
    queryKey: ['jd', id],
    queryFn: () => http<JobDescriptionDTO>(`/api/jds/${id}`),
    enabled: !!id,
  })
}

export interface CreateJdBody {
  title: string
  company?: string
  rawText: string
  isActive?: boolean
  priority?: string
  notes?: string | null
  targetId?: string | null
  source?: string
}

export function useCreateJd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateJdBody) =>
      http<JobDescriptionDTO>('/api/jds', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('JD parsed & saved', { description: `Saved as ${data.title}.` })
      qc.invalidateQueries({ queryKey: ['jds'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to parse JD', { description: err.message }),
  })
}

export function useUpdateJd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateJdBody> }) =>
      http<JobDescriptionDTO>(`/api/jds/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('JD updated')
      qc.invalidateQueries({ queryKey: ['jds'] })
      qc.invalidateQueries({ queryKey: ['jd', data.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to update JD', { description: err.message }),
  })
}

export function useToggleJdActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      http<JobDescriptionDTO>(`/api/jds/${id}/toggle-active`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success(data.isActive ? 'Marked as active search' : 'Removed from active searches')
      qc.invalidateQueries({ queryKey: ['jds'] })
      qc.invalidateQueries({ queryKey: ['jd', data.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to toggle active', { description: err.message }),
  })
}

export function useDeleteJd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http(`/api/jds/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('JD deleted')
      qc.invalidateQueries({ queryKey: ['jds'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to delete JD', { description: err.message }),
  })
}

export function useRunMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jdId: string) =>
      http<MatchDTO>(`/api/jds/${jdId}/match`, { method: 'POST' }),
    onSuccess: (data) => {
      const strength = data.internalStrength ?? 'unknown'
      toast.success('Internal match complete', {
        description: `${data.results.length} ranked · strength ${strength}.`,
      })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['jds'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to run match', { description: err.message }),
  })
}

// Scrape external prospects (Step 4 supplement — only when internal match is weak/moderate)
export function useScrapeExternal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) =>
      http<MatchDTO>(`/api/matches/${matchId}/scrape-external`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('External scrape complete', {
        description: `${data.externalProspects.length} prospects surfaced.`,
      })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['match', data.id] })
    },
    onError: (err: Error) =>
      toast.error('Scrape failed', { description: err.message }),
  })
}

// ---- Workflow actions (Faahika's 9-step flow) ----

// Step 5: Oceans team profile-fit approve/reject
export function useDecideFit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ resultId, decision }: { resultId: string; decision: 'approved' | 'rejected' }) =>
      http<{ id: string; fitStatus: string }>(`/api/match-results/${resultId}/decide-fit`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      }),
    onSuccess: (data) => {
      toast.success(`Profile-fit ${data.fitStatus}`)
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['match'] })
    },
    onError: (err: Error) => toast.error('Failed to record decision', { description: err.message }),
  })
}

// Step 6: generate Oceans-branded redacted profile
export function useGenerateRedactedProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (resultId: string) =>
      http<{ candidateId: string; oceanId: string; markdown: string }>(`/api/match-results/${resultId}/redacted`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      toast.success('Redacted profile generated', { description: data.oceanId })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['match'] })
      qc.invalidateQueries({ queryKey: ['candidates'] })
    },
    onError: (err: Error) => toast.error('Failed to generate profile', { description: err.message }),
  })
}

// Step 7: notify Slack (drafts in-app when no token)
export function useNotifySlack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, matchResultId }: { matchId: string; matchResultId: string }) =>
      http<{ ok: boolean; drafted?: boolean; channel?: string; message?: string }>(
        `/api/matches/${matchId}/notify-slack`,
        { method: 'POST', body: JSON.stringify({ matchResultId }) }
      ),
    onSuccess: (data) => {
      if (data.drafted) {
        toast.success('Slack message drafted', { description: 'Add SLACK_BOT_TOKEN to post for real.' })
      } else {
        toast.success('Slack notified', { description: `Posted to ${data.channel ?? ''}` })
      }
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: (err: Error) => toast.error('Slack notify failed', { description: err.message }),
  })
}

// Step 8: request leadership approval
export function useRequestLeadership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, matchResultId }: { matchId: string; matchResultId: string }) =>
      http<{ ok: boolean; status: string }>(`/api/matches/${matchId}/request-leadership`, {
        method: 'POST',
        body: JSON.stringify({ matchResultId }),
      }),
    onSuccess: () => {
      toast.success('Leadership approval requested')
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: (err: Error) => toast.error('Failed to request approval', { description: err.message }),
  })
}

// Step 9: send prospect email via HubSpot (drafts when no token)
export function useSendProspectEmail() {
  return useMutation({
    mutationFn: ({
      matchId,
      to,
      subject,
      body,
    }: {
      matchId: string
      to: string
      subject: string
      body: string
    }) =>
      http<{ ok: boolean; drafted?: boolean; message?: string }>(`/api/matches/${matchId}/send-email`, {
        method: 'POST',
        body: JSON.stringify({ to, subject, body }),
      }),
    onSuccess: (data) => {
      if (data.drafted) {
        toast.success('Email drafted', { description: 'Add HUBSPOT_ACCESS_TOKEN to send for real.' })
      } else {
        toast.success('Email sent via HubSpot')
      }
    },
    onError: (err: Error) => toast.error('Failed to send email', { description: err.message }),
  })
}

// Update an external prospect's status (reviewed | promoted | rejected)
export function useUpdateProspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      http<{ id: string }>(`/api/external-prospects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['match'] })
    },
    onError: (err: Error) => toast.error('Failed to update prospect', { description: err.message }),
  })
}

// ----- Job Targets -----
export function useJobTargets() {
  return useQuery<JobTargetDTO[]>({
    queryKey: ['job-targets'],
    queryFn: () => http<JobTargetDTO[]>('/api/job-targets'),
  })
}

export interface JobTargetInput {
  name: string
  description?: string | null
  roleTypes?: string[]
  stages?: string[]
  industries?: string[]
  regions?: string[]
  salaryMinUsd?: number | null
  remoteOnly?: boolean
  signals?: string[]
  keywords?: string[]
}

export function useCreateJobTarget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: JobTargetInput) =>
      http<JobTargetDTO>('/api/job-targets', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('Job target created', { description: data.name })
      qc.invalidateQueries({ queryKey: ['job-targets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to create job target', { description: err.message }),
  })
}

export function useUpdateJobTarget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<JobTargetInput> }) =>
      http<JobTargetDTO>(`/api/job-targets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('Job target updated')
      qc.invalidateQueries({ queryKey: ['job-targets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to update job target', { description: err.message }),
  })
}

export function useDeleteJobTarget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http(`/api/job-targets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('ICP deleted')
      qc.invalidateQueries({ queryKey: ['job-targets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to delete ICP', { description: err.message }),
  })
}

// Scrape jobs for an ICP (Agent 1 / Step 1)
export function useScrapeIcpJobs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (icpId: string) =>
      http<{ icp: JobTargetDTO; jobs: ScrapedJobDTO[] }>(`/api/job-targets/${icpId}/scrape`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      toast.success('Scrape complete', {
        description: `${data.jobs.length} jobs found for ${data.icp.name}.`,
      })
      qc.invalidateQueries({ queryKey: ['job-targets'] })
      qc.invalidateQueries({ queryKey: ['icp-jobs', data.icp.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
    onError: (err: Error) => toast.error('Scrape failed', { description: err.message }),
  })
}

// Get scraped jobs for an ICP
export function useIcpJobs(icpId: string | null) {
  return useQuery<ScrapedJobDTO[]>({
    queryKey: ['icp-jobs', icpId],
    queryFn: () => http<ScrapedJobDTO[]>(`/api/job-targets/${icpId}/jobs`),
    enabled: !!icpId,
  })
}

// Convert a scraped job into a JD (source: agent)
export function useConvertScrapedJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) =>
      http<{ jd: JobDescriptionDTO }>(`/api/scraped-jobs/${jobId}/convert-to-jd`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('Converted to JD', {
        description: `${data.jd.title} @ ${data.jd.company} — now in Job Descriptions.`,
      })
      qc.invalidateQueries({ queryKey: ['job-targets'] })
      qc.invalidateQueries({ queryKey: ['icp-jobs'] })
      qc.invalidateQueries({ queryKey: ['jds'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to convert job', { description: err.message }),
  })
}

// Dismiss a scraped job
export function useDismissScrapedJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => http(`/api/scraped-jobs/${jobId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Job dismissed')
      qc.invalidateQueries({ queryKey: ['job-targets'] })
      qc.invalidateQueries({ queryKey: ['icp-jobs'] })
      qc.invalidateQueries({ queryKey: ['pipeline'] })
    },
    onError: (err: Error) => toast.error('Failed to dismiss job', { description: err.message }),
  })
}

// Step 2: Find the decision maker for a scraped job
export function useFindDecisionMaker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) =>
      http<ScrapedJobDTO>(`/api/scraped-jobs/${jobId}/find-dm`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('Decision maker found', { description: data.dmTitle ?? '' })
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['icp-jobs'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to find decision maker', { description: err.message }),
  })
}

// Step 2b: Find warm-intro referrers for a scraped job's company
export function useFindReferrers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) =>
      http<ScrapedJobDTO>(`/api/scraped-jobs/${jobId}/find-referrers`, { method: 'POST' }),
    onSuccess: (data) => {
      const n = data.referrers?.length ?? 0
      if (n > 0) {
        toast.success(`Found ${n} warm-intro path${n === 1 ? '' : 's'}`)
      } else {
        toast.success('Referrer search complete', { description: 'No referrers found for this company.' })
      }
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['icp-jobs'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to find referrers', { description: err.message }),
  })
}

// Step 3: Outreach actions (draft / send / reply)
export function useScrapedJobOutreach() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, action }: { jobId: string; action: 'draft' | 'send' | 'reply' }) =>
      http<ScrapedJobDTO>(`/api/scraped-jobs/${jobId}/outreach`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
    onSuccess: (data, vars) => {
      const msgs = { draft: 'Outreach drafted', send: 'Outreach sent', reply: 'Marked as replied' }
      toast.success(msgs[vars.action])
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['icp-jobs'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Outreach failed', { description: err.message }),
  })
}

// Update a scraped job (dmName, dmNotes, status, etc.)
export function useUpdateScrapedJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: Record<string, unknown> }) =>
      http<ScrapedJobDTO>(`/api/scraped-jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['icp-jobs'] })
    },
    onError: (err: Error) => toast.error('Failed to update', { description: err.message }),
  })
}

// ----- Pipeline (all scraped jobs across all ICPs) -----
export function usePipeline() {
  return useQuery<ScrapedJobDTO[]>({
    queryKey: ['pipeline'],
    queryFn: () => http<ScrapedJobDTO[]>('/api/pipeline'),
  })
}

// ----- Briefs -----
export function useBriefs() {
  return useQuery<BriefDTO[]>({
    queryKey: ['briefs'],
    queryFn: () => http<BriefDTO[]>('/api/briefs'),
  })
}

export interface BriefInput {
  title: string
  content: string
  type?: string
  linkedJdId?: string | null
}

export function useCreateBrief() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BriefInput) =>
      http<BriefDTO>('/api/briefs', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Brief saved')
      qc.invalidateQueries({ queryKey: ['briefs'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to save brief', { description: err.message }),
  })
}

export function useUpdateBrief() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<BriefInput> }) =>
      http<BriefDTO>(`/api/briefs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Brief updated')
      qc.invalidateQueries({ queryKey: ['briefs'] })
    },
    onError: (err: Error) => toast.error('Failed to update brief', { description: err.message }),
  })
}

export function useDeleteBrief() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http(`/api/briefs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Brief deleted')
      qc.invalidateQueries({ queryKey: ['briefs'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to delete brief', { description: err.message }),
  })
}

export function useConvertBriefToJd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { title?: string; company?: string } }) =>
      http<{ jd: JobDescriptionDTO; brief: BriefDTO }>(`/api/briefs/${id}/convert-to-jd`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      toast.success('Converted to JD', { description: `Saved as ${data.jd.title} — view it in Job Descriptions.` })
      qc.invalidateQueries({ queryKey: ['briefs'] })
      qc.invalidateQueries({ queryKey: ['jds'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to convert brief', { description: err.message }),
  })
}

// ----- Matches -----
export function useMatches() {
  return useQuery<MatchDTO[]>({
    queryKey: ['matches'],
    queryFn: () => http<MatchDTO[]>('/api/matches'),
  })
}

export function useMatch(id: string | null) {
  return useQuery<MatchDTO>({
    queryKey: ['match', id],
    queryFn: () => http<MatchDTO>(`/api/matches/${id}`),
    enabled: !!id,
  })
}

// ----- Leads -----
export function useLeads() {
  return useQuery<LeadDTO[]>({
    queryKey: ['leads'],
    queryFn: () => http<LeadDTO[]>('/api/leads'),
  })
}

export function useLead(id: string | null) {
  return useQuery<LeadDTO>({
    queryKey: ['lead', id],
    queryFn: () => http<LeadDTO>(`/api/leads/${id}`),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      http<LeadDTO>('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('Lead added', { description: data.companyName })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to add lead', { description: err.message }),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      http<LeadDTO>(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('Lead updated')
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead', data.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to update lead', { description: err.message }),
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http(`/api/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to delete lead', { description: err.message }),
  })
}

export function useCreateOutreach() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, body }: { leadId: string; body: { channel: string; action: string; role?: string } }) =>
      http<OutreachStepDTO>(`/api/leads/${leadId}/outreach`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success('Outreach step drafted', { description: `Step ${data.step} via ${data.channel}.` })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to draft outreach', { description: err.message }),
  })
}

export function useUpdateOutreach() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status: string; sentAt?: string | null } }) =>
      http<OutreachStepDTO>(`/api/outreach/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Outreach updated')
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error('Failed to update outreach', { description: err.message }),
  })
}

// ----- ICP -----
export function useIcp() {
  return useQuery<IcpConfigDTO>({
    queryKey: ['icp'],
    queryFn: () => http<IcpConfigDTO>('/api/icp'),
  })
}

export function useUpdateIcp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<IcpConfigDTO>) =>
      http<IcpConfigDTO>('/api/icp', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('ICP saved')
      qc.invalidateQueries({ queryKey: ['icp'] })
    },
    onError: (err: Error) => toast.error('Failed to save ICP', { description: err.message }),
  })
}

// ----- Activities -----
export function useActivities(limit = 20) {
  return useQuery<ActivityDTO[]>({
    queryKey: ['activities', limit],
    queryFn: () => http<ActivityDTO[]>(`/api/activities?limit=${limit}`),
  })
}

// ----- Seed -----
export function useSeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => http('/api/seed', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Database re-seeded')
      qc.invalidateQueries()
    },
    onError: (err: Error) => toast.error('Failed to re-seed', { description: err.message }),
  })
}

// ----- Integrations -----
export function useIntegrations() {
  return useQuery<IntegrationDTO[]>({
    queryKey: ['integrations'],
    queryFn: () => http<IntegrationDTO[]>('/api/integrations'),
  })
}

export function useConnectIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey: string }) =>
      http<IntegrationDTO>(`/api/integrations/${provider}`, {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      }),
    onSuccess: (data) => {
      toast.success(`${data.label} connected`)
      qc.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: (err: Error) => toast.error('Failed to connect', { description: err.message }),
  })
}

export function useDisconnectIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) =>
      http(`/api/integrations/${provider}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Integration disconnected')
      qc.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: (err: Error) => toast.error('Failed to disconnect', { description: err.message }),
  })
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey?: string }) =>
      http<{ ok: boolean; message: string; accountInfo?: string }>(
        `/api/integrations/${provider}/test`,
        { method: 'POST', body: JSON.stringify({ apiKey: apiKey ?? '' }) }
      ),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success('Connection test passed', {
          description: data.accountInfo ?? data.message,
        })
      } else {
        toast.error('Connection test failed', { description: data.message })
      }
    },
    onError: (err: Error) => toast.error('Test failed', { description: err.message }),
  })
}
