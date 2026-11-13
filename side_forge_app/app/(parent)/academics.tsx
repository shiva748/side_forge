import React, { useEffect } from 'react';
import { View } from 'react-native';
import {
  BookOpen,
  Calendar,
  CalendarCheck,
  FileSpreadsheet,
  GraduationCap,
} from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme';
import {
  useAuthWorkspaceStore,
  type ParentAcademicSection,
} from '@/store/useAuthWorkspaceStore';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { ParentAcademicSubNavBar } from '@/components/parent/ParentAcademicSubNavBar';
import {
  EmptyState,
  FeatureTileGrid,
  type FeatureTileItem,
  ScreenContainer,
} from '@/components/ui';
import ParentAttendanceScreen from './attendance';
import ParentExamsScreen from './exams';
import ParentHomeworkScreen from './homework';
import ParentTimetableScreen from './timetable';

export default function ParentAcademicsScreen() {
  const { colors, spacing, iconSizes } = useAppTheme();
  const { navigateTo } = useSafeNavigation();
  const params = useLocalSearchParams<{ section?: string }>();
  const parentAcademicSection = useAuthWorkspaceStore(
    (s) => s.parentAcademicSection
  );
  const setParentAcademicSection = useAuthWorkspaceStore(
    (s) => s.setParentAcademicSection
  );

  // Sync URL query param if externally provided (e.g., deep link or browser URL)
  useEffect(() => {
    const raw = params.section;
    if (
      raw === 'homework' ||
      raw === 'exams' ||
      raw === 'timetable' ||
      raw === 'attendance'
    ) {
      setParentAcademicSection(raw as ParentAcademicSection);
    }
  }, [params.section, setParentAcademicSection]);

  const activeSection = parentAcademicSection || params.section || 'homework';

  if (activeSection === 'attendance') {
    return <ParentAttendanceScreen />;
  }

  if (activeSection === 'homework') {
    return <ParentHomeworkScreen />;
  }

  if (activeSection === 'exams') {
    return <ParentExamsScreen />;
  }

  if (activeSection === 'timetable') {
    return <ParentTimetableScreen />;
  }

  const academicTiles: FeatureTileItem[] = [
    {
      key: 'attendance',
      title: 'Student Attendance',
      description: 'Monthly attendance calendar, summary & daily history',
      Icon: CalendarCheck,
      tone: 'success',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'attendance' },
        }),
    },
    {
      key: 'timetable',
      title: 'Class Timetable',
      description: 'Weekly class and section period schedule',
      Icon: Calendar,
      tone: 'primary',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'timetable' },
        }),
    },
    {
      key: 'homework',
      title: 'Homework',
      description: 'Assigned homework tasks & submissions',
      Icon: FileSpreadsheet,
      tone: 'info',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'homework' },
        }),
    },
    {
      key: 'exams',
      title: 'Exams & Results',
      description: 'Examination schedules & published report cards',
      Icon: GraduationCap,
      tone: 'warning',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'exams' },
        }),
    },
  ];

  const sectionMeta = (() => {
    switch (params.section) {
      case 'timetable':
        return {
          title: 'Weekly Class Timetable',
          description:
            'Full weekly day-by-day class and section period schedules will be available in the Timetable module.',
        };
      case 'homework':
        return {
          title: 'Homework & Assignments',
          description:
            'Full assignment details, teacher reference files, and homework submissions will be available in the Homework module.',
        };
      case 'exams':
        return {
          title: 'Examinations & Report Cards',
          description:
            'Detailed subject-wise examination schedules, marks, and downloadable report cards will be available in the Examinations module.',
        };
      default:
        return null;
    }
  })();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Academics"
          subtitle="Attendance, timetable, homework & examination results"
        />
      }
    >
      <ParentAcademicSubNavBar activeSection="timetable" />

      <View style={{ marginBottom: spacing.md }}>
        <FeatureTileGrid tiles={academicTiles} />
      </View>

      {sectionMeta ? (
        <EmptyState
          icon={<BookOpen size={iconSizes.xl} color={colors.primary} />}
          title={sectionMeta.title}
          description={sectionMeta.description}
        />
      ) : null}
    </ScreenContainer>
  );
}




