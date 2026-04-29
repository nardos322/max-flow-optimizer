import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { getPeriodIdForDay } from '../draft/index.js';
import { useAppDispatch, useAppState } from '../../state/appState.js';
import { PageSection } from '../../shared/ui/index.js';
import { DayFormPanel } from './components/DayFormPanel.js';
import { DaysListPanel } from './components/DaysListPanel.js';
import { PeriodFormPanel } from './components/PeriodFormPanel.js';
import { PeriodsListPanel } from './components/PeriodsListPanel.js';
import { dayFormSchema, type DayFormValues, type PeriodFormValues } from './types.js';

export function PeriodsPage() {
  const { instanceDraft } = useAppState();
  const dispatch = useAppDispatch();
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);

  const editingPeriod = useMemo(
    () => instanceDraft.periods.find((period) => period.id === editingPeriodId) ?? null,
    [editingPeriodId, instanceDraft.periods]
  );
  const editingDay = useMemo(
    () => instanceDraft.days.find((day) => day.id === editingDayId) ?? null,
    [editingDayId, instanceDraft.days]
  );
  const assignableDays = useMemo(() => {
    return instanceDraft.days.filter((day) => {
      const assignedPeriodId = getPeriodIdForDay(instanceDraft.periods, day.id);
      return assignedPeriodId === null || assignedPeriodId === editingPeriodId;
    });
  }, [editingPeriodId, instanceDraft.days, instanceDraft.periods]);

  const periodForm = useForm<PeriodFormValues>({
    defaultValues: {
      id: ''
    }
  });

  const dayForm = useForm<DayFormValues>({
    resolver: zodResolver(dayFormSchema),
    defaultValues: {
      id: '',
      date: '',
      periodId: instanceDraft.periods[0]?.id ?? ''
    }
  });

  useEffect(() => {
    if (!editingPeriod) {
      periodForm.reset({ id: '' });
      setSelectedDayIds([]);
      return;
    }

    periodForm.reset({
      id: editingPeriod.id
    });
    setSelectedDayIds(editingPeriod.dayIds);
  }, [editingPeriod, periodForm]);

  useEffect(() => {
    if (!editingDay) {
      dayForm.reset({
        id: '',
        date: '',
        periodId: instanceDraft.periods[0]?.id ?? ''
      });
      return;
    }

    dayForm.reset({
      id: editingDay.id,
      date: editingDay.date,
      periodId: getPeriodIdForDay(instanceDraft.periods, editingDay.id) ?? ''
    });
  }, [dayForm, editingDay, instanceDraft.periods]);

  return (
    <PageSection
      title="Periodos"
      description="Define la estructura de periodos y asigna cada dia a un unico periodo."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <PeriodFormPanel
          assignableDays={assignableDays}
          editingPeriod={editingPeriod}
          instanceDraft={instanceDraft}
          periodForm={periodForm}
          selectedDayIds={selectedDayIds}
          onCancel={() => {
            setEditingPeriodId(null);
            periodForm.reset({ id: '' });
            setSelectedDayIds([]);
          }}
          onSelectedDayIdsChange={setSelectedDayIds}
          onSubmit={(values) => {
            dispatch({
              type: 'upsertPeriod',
              period: {
                id: values.id,
                dayIds: selectedDayIds
              }
            });
            setEditingPeriodId(null);
            periodForm.reset({ id: '' });
            setSelectedDayIds([]);
          }}
        />

        <DayFormPanel
          dayForm={dayForm}
          editingDay={editingDay}
          instanceDraft={instanceDraft}
          onCancel={() => {
            setEditingDayId(null);
            dayForm.reset({ id: '', date: '', periodId: instanceDraft.periods[0]?.id ?? '' });
          }}
          onSubmit={(values) => {
            dispatch({
              type: 'upsertDay',
              day: {
                id: values.id,
                date: values.date
              },
              periodId: values.periodId
            });
            setEditingDayId(null);
            dayForm.reset({ id: '', date: '', periodId: instanceDraft.periods[0]?.id ?? '' });
          }}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <PeriodsListPanel dispatch={dispatch} instanceDraft={instanceDraft} onEditPeriod={setEditingPeriodId} />
        <DaysListPanel dispatch={dispatch} instanceDraft={instanceDraft} onEditDay={setEditingDayId} />
      </div>
    </PageSection>
  );
}
