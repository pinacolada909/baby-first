import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useTimeBlocks, useAddTimeBlock, useDeleteTimeBlock } from '@/hooks/useTimeBlocks'
import { useCareTasks, useAddCareTask, useToggleTask, useDeleteCareTask } from '@/hooks/useCareTasks'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import type { TimeBlock, CareTask, TaskType, TimeBlockType, BabyCaregiver } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Clock, Trash2, AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { CaregiverManager } from '@/components/baby/CaregiverManager'

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const TASK_TYPES: TaskType[] = ['change_diapers', 'feeding', 'cooking', 'cleaning', 'laundry', 'doctor_visit', 'shopping']


interface DemoCaregiver {
  id: string
  name: string
}

export function TimeManagementPage() {
  const { t } = useLanguage()
  const { isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  // DB data
  const { data: dbCaregivers = [] } = useCaregivers(babyId)
  const { data: dbBlocks = [] } = useTimeBlocks(babyId)
  const { data: dbTasks = [] } = useCareTasks(babyId)
  const addBlockMut = useAddTimeBlock()
  const deleteBlockMut = useDeleteTimeBlock()
  const addTaskMut = useAddCareTask()
  const toggleTaskMut = useToggleTask()
  const deleteTaskMut = useDeleteCareTask()
  useRealtimeSync('time_blocks', babyId, queryKeys.timeBlocks.byBaby(babyId ?? ''))
  useRealtimeSync('care_tasks', babyId, queryKeys.careTasks.byBaby(babyId ?? ''))

  // Demo state
  const [demoCaregivers, setDemoCaregivers] = useState<DemoCaregiver[]>([{ id: '1', name: 'Parent 1' }])
  const [demoBlocks, setDemoBlocks] = useState<TimeBlock[]>([])
  const [demoTasks, setDemoTasks] = useState<CareTask[]>([])
  const [newCaregiverName, setNewCaregiverName] = useState('')

  const caregiverList = isDemo
    ? demoCaregivers.map((c) => ({ user_id: c.id, display_name: c.name, role: 'primary' as const, baby_id: '', joined_at: '' }))
    : dbCaregivers.map((c: BabyCaregiver) => ({
      ...c,
    }))
  const blocks = isDemo ? demoBlocks : dbBlocks
  const tasks = isDemo ? demoTasks : dbTasks

  // Block form
  const now = new Date()
  const [blockCaregiver, setBlockCaregiver] = useState('')
  const [blockType, setBlockType] = useState<TimeBlockType>('care')
  const [blockStart, setBlockStart] = useState(formatDatetimeLocal(new Date(now.getTime() - 3600000)))
  const [blockEnd, setBlockEnd] = useState(formatDatetimeLocal(now))
  const [blockNotes, setBlockNotes] = useState('')

  // Task form
  const [taskCaregiver, setTaskCaregiver] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('feeding')
  const [taskNotes, setTaskNotes] = useState('')

  const addDemoCaregiver = () => {
    if (!newCaregiverName.trim()) return
    setDemoCaregivers((prev) => [...prev, { id: crypto.randomUUID(), name: newCaregiverName.trim() }])
    setNewCaregiverName('')
  }

  const handleAddBlock = async () => {
    const cgId = blockCaregiver || caregiverList[0]?.user_id
    if (!cgId) return
    const block = {
      baby_id: babyId ?? 'demo',
      caregiver_id: cgId,
      block_type: blockType,
      start_time: new Date(blockStart).toISOString(),
      end_time: new Date(blockEnd).toISOString(),
      notes: blockNotes || null,
    }
    if (isDemo) {
      setDemoBlocks((prev) => [{ ...block, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...prev])
    } else {
      await addBlockMut.mutateAsync(block)
    }
    setBlockNotes('')
    toast.success(t('time.block.added'))
  }

  const handleDeleteBlock = async (id: string) => {
    if (isDemo) {
      setDemoBlocks((prev) => prev.filter((b) => b.id !== id))
    } else {
      await deleteBlockMut.mutateAsync({ id, babyId: babyId! })
    }
    toast.success(t('time.block.deleted'))
  }

  const handleAddTask = async () => {
    const cgId = taskCaregiver || caregiverList[0]?.user_id
    if (!cgId) return
    const task = {
      baby_id: babyId ?? 'demo',
      caregiver_id: cgId,
      task_type: taskType,
      completed: false,
      assigned_at: new Date().toISOString(),
      completed_at: null,
      notes: taskNotes || null,
    }
    if (isDemo) {
      setDemoTasks((prev) => [{ ...task, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...prev])
    } else {
      await addTaskMut.mutateAsync(task)
    }
    setTaskNotes('')
    toast.success(t('time.task.added'))
  }

  const handleToggleTask = async (task: CareTask) => {
    if (isDemo) {
      setDemoTasks((prev) =>
        prev.map((t) => t.id === task.id ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null } : t)
      )
    } else {
      await toggleTaskMut.mutateAsync({ id: task.id, babyId: babyId!, completed: !task.completed })
    }
    toast.success(t('time.task.toggled'))
  }

  const handleDeleteTask = async (id: string) => {
    if (isDemo) {
      setDemoTasks((prev) => prev.filter((t) => t.id !== id))
    } else {
      await deleteTaskMut.mutateAsync({ id, babyId: babyId! })
    }
    toast.success(t('time.task.deleted'))
  }

  // Analytics
  const timeDistribution = useMemo(() => {
    return caregiverList.map((cg) => {
      const cgBlocks = blocks.filter((b) => b.caregiver_id === cg.user_id)
      const care = cgBlocks.filter((b) => b.block_type === 'care').reduce((s, b) => s + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000, 0)
      const rest = cgBlocks.filter((b) => b.block_type === 'rest').reduce((s, b) => s + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000, 0)
      return { name: cg.display_name, care: Math.round(care * 10) / 10, rest: Math.round(rest * 10) / 10 }
    })
  }, [caregiverList, blocks])

  const careVsRest = useMemo(() => {
    const totalCare = timeDistribution.reduce((s, d) => s + d.care, 0)
    const totalRest = timeDistribution.reduce((s, d) => s + d.rest, 0)
    return [
      { name: t('time.blockType.care'), value: Math.round(totalCare * 10) / 10 },
      { name: t('time.blockType.rest'), value: Math.round(totalRest * 10) / 10 },
    ]
  }, [timeDistribution, t])

  // Rest alerts
  const restAlerts = useMemo(() => {
    const twentyFourAgo = new Date(Date.now() - 24 * 3600000)
    return caregiverList.filter((cg) => {
      const restHours = blocks
        .filter((b) => b.caregiver_id === cg.user_id && b.block_type === 'rest' && new Date(b.start_time) >= twentyFourAgo)
        .reduce((s, b) => s + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000, 0)
      return restHours < 6
    })
  }, [caregiverList, blocks])

  const getCaregiverName = (id: string) => caregiverList.find((c) => c.user_id === id)?.display_name ?? id
  const taskTranslation = (tt: TaskType) => t(`time.task.${tt}` as `time.task.${'change_diapers' | 'feeding' | 'cooking' | 'cleaning' | 'laundry' | 'doctor_visit' | 'shopping'}`)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('time.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('time.subtitle')}</p>
      </div>

      {/* Rest Alerts */}
      {restAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            {restAlerts.map((cg) => (
              <div key={cg.user_id} className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{cg.display_name}</span> {t('time.restAlert')}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Caregivers */}
      {isDemo ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">{t('time.caregivers')}</h2>
            <div className="flex flex-wrap gap-2">
              {demoCaregivers.map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.name}
                  <button className="ml-1 text-xs" onClick={() => setDemoCaregivers((p) => p.filter((x) => x.id !== c.id))}>&times;</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newCaregiverName} onChange={(e) => setNewCaregiverName(e.target.value)} placeholder={t('time.caregiverName')} className="max-w-xs" />
              <Button variant="outline" onClick={addDemoCaregiver}>{t('time.addCaregiver')}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CaregiverManager />
      )}

      {/* Time Blocks */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{t('time.timeBlocks')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>{t('time.caregiver')}</Label>
              <select className="w-full rounded-md border p-2 text-sm" value={blockCaregiver} onChange={(e) => setBlockCaregiver(e.target.value)}>
                {caregiverList.map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('time.blockType')}</Label>
              <div className="mt-1 flex gap-2">
                <Button variant={blockType === 'care' ? 'default' : 'outline'} size="sm" onClick={() => setBlockType('care')}>{t('time.blockType.care')}</Button>
                <Button variant={blockType === 'rest' ? 'secondary' : 'outline'} size="sm" onClick={() => setBlockType('rest')}>{t('time.blockType.rest')}</Button>
              </div>
            </div>
            <div>
              <Label>{t('time.startTime')}</Label>
              <Input type="datetime-local" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
            </div>
            <div>
              <Label>{t('time.endTime')}</Label>
              <Input type="datetime-local" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
            </div>
          </div>
          <Input value={blockNotes} onChange={(e) => setBlockNotes(e.target.value)} placeholder={t('time.notes')} />
          <Button onClick={handleAddBlock}>{t('time.addBlock')}</Button>

          {blocks.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{t('time.empty.blocks')}</p>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={b.block_type === 'care' ? 'default' : 'secondary'}>{b.block_type === 'care' ? t('time.blockType.care') : t('time.blockType.rest')}</Badge>
                    <span className="text-sm font-medium">{getCaregiverName(b.caregiver_id)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleString()}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{t('time.tasks')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>{t('time.caregiver')}</Label>
              <select className="w-full rounded-md border p-2 text-sm" value={taskCaregiver} onChange={(e) => setTaskCaregiver(e.target.value)}>
                {caregiverList.map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('time.taskType')}</Label>
              <select className="w-full rounded-md border p-2 text-sm" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)}>
                {TASK_TYPES.map((tt) => <option key={tt} value={tt}>{taskTranslation(tt)}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('time.notes')}</Label>
              <Input value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} placeholder={t('time.notes')} />
            </div>
          </div>
          <Button onClick={handleAddTask}>{t('time.addTask')}</Button>

          {tasks.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{t('time.empty.tasks')}</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <button
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${task.completed ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}
                      onClick={() => handleToggleTask(task)}
                    >
                      {task.completed && <Check className="h-3 w-3" />}
                    </button>
                    <div>
                      <p className={`text-sm font-medium ${task.completed ? 'text-muted-foreground line-through' : ''}`}>
                        {taskTranslation(task.task_type)} — {getCaregiverName(task.caregiver_id)}
                      </p>
                      {task.notes && <p className="text-xs text-muted-foreground">{task.notes}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">{t('time.analytics')}</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Time Distribution */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t('time.distribution')}</h3>
              {timeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={timeDistribution}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="care" fill="#7c3aed" name={t('time.blockType.care')} />
                    <Bar dataKey="rest" fill="#10b981" name={t('time.blockType.rest')} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-8 text-center text-sm text-muted-foreground">{t('common.noData')}</p>}
            </div>

            {/* Care vs Rest Pie */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t('time.careVsRest')}</h3>
              {careVsRest.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={careVsRest} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      <Cell fill="#7c3aed" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-8 text-center text-sm text-muted-foreground">{t('common.noData')}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
