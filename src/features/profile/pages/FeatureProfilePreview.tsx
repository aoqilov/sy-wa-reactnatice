import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import {
  CusAccordion,
  CusAvatar,
  CusBadge,
  CusButton,
  CusCard,
  CusCheckbox,
  CusChip,
  CusDivider,
  CusEmptyState,
  CusImage,
  CusInput,
  CusListItem,
  CusMenuTabs,
  CusSelect,
  CusSkeleton,
  CusSwitch,
  CusText,
} from "@/components/ui";

const TABS = [
  { label: "Barchasi", value: "all" },
  { label: "Bugun", value: "today" },
  { label: "Kecha", value: "yesterday" },
  { label: "Hafta", value: "week" },
  { label: "Oy", value: "month" },
];

const DOCTORS = [
  { label: "Кузнецов И.Ф.", value: "1" },
  { label: "Лебедев В.К.", value: "2" },
  { label: "Смирнова А.А.", value: "3" },
];

const FILTERS = ["Barchasi", "Kardiologiya", "Diagnostika", "Laboratoriya"];

// Har bir bo'lim sarlavhasi + ichidagi komponentlar
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <CusText variant="heading">{title}</CusText>
      {children}
    </View>
  );
}

export function FeatureProfilePreview() {
  const [tab, setTab] = useState("all");
  const [doctor, setDoctor] = useState<string>();
  const [filter, setFilter] = useState("Barchasi");
  const [agree, setAgree] = useState(false);
  const [notify, setNotify] = useState(true);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-border bg-surface px-2 py-1">
        <CusButton title="← Orqaga" variant="ghost" className="h-10" onPress={() => router.back()} />
      </View>
      <CusMenuTabs tabs={TABS} value={tab} onChange={setTab} />

      <ScrollView contentContainerClassName="gap-6 p-4 pb-10">
        <CusText variant="title">UI komponentlar ({tab})</CusText>

        <Section title="CusText">
          <CusText variant="title">Title</CusText>
          <CusText variant="heading">Heading</CusText>
          <CusText>Body: oddiy matn</CusText>
          <CusText variant="caption" tone="muted">
            Caption: kichik, ikkilamchi matn
          </CusText>
          <CusText tone="primary">Primary</CusText>
          <CusText tone="danger">Danger</CusText>
          <CusText tone="success">Success</CusText>
        </Section>

        <Section title="CusButton">
          <CusButton title="Primary" />
          <CusButton title="Outline" variant="outline" />
          <CusButton title="Ghost" variant="ghost" />
          <CusButton title="Loading" loading />
          <CusButton title="Disabled" disabled />
        </Section>

        <Section title="CusBadge">
          <View className="flex-row flex-wrap gap-2">
            <CusBadge label="Закончен" tone="success" />
            <CusBadge label="Срочно" tone="warning" />
            <CusBadge label="Отменен" tone="danger" />
            <CusBadge label="Оплачен" tone="info" />
            <CusBadge label="Возврат" tone="neutral" />
          </View>
        </Section>

        <Section title="CusChip">
          <View className="flex-row flex-wrap gap-2">
            {FILTERS.map((f) => (
              <CusChip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </View>
        </Section>

        <Section title="CusInput">
          <CusInput label="Ism" placeholder="Ismingizni kiriting" />
          <CusInput label="Telefon" placeholder="+998" error="Noto'g'ri raqam" />
        </Section>

        <Section title="CusSelect">
          <CusSelect
            label="Shifokor"
            placeholder="Shifokorni tanlang"
            options={DOCTORS}
            value={doctor}
            onChange={setDoctor}
          />
        </Section>

        <Section title="CusCheckbox va CusSwitch">
          <CusCheckbox checked={agree} onChange={setAgree} label="Shartlarga roziman" />
          <CusSwitch value={notify} onValueChange={setNotify} label="Bildirishnomalar" />
        </Section>

        <Section title="CusAccordion">
          <CusAccordion title="Tashrif tafsilotlari" defaultOpen>
            <CusText>Kardiologiya, ambulator</CusText>
            <CusText tone="muted">16.02.2026, 09:30</CusText>
          </CusAccordion>
          <CusAccordion title="To'lov ma'lumotlari">
            <CusText>350 000 UZS</CusText>
          </CusAccordion>
        </Section>

        <Section title="CusCard, CusListItem, CusAvatar, CusDivider">
          <CusCard className="p-0">
            <CusListItem
              title="Тихонов М.Ф."
              subtitle="Кузнецов И.Ф. · 25.02.2026"
              left={<CusAvatar name="Тихонов Михаил" />}
              right={<CusBadge label="Закончен" tone="success" />}
              onPress={() => {}}
            />
            <CusDivider />
            <CusListItem
              title="Морозов Д.А."
              subtitle="Лебедев В.К. · 23.02.2026"
              left={<CusAvatar name="Морозов Дмитрий" />}
              right={<CusBadge label="Срочно" tone="warning" />}
              onPress={() => {}}
            />
          </CusCard>
          <View className="flex-row items-center gap-3">
            <CusAvatar name="Ali Valiyev" size="sm" />
            <CusAvatar name="Ali Valiyev" size="md" />
            <CusAvatar name="Ali Valiyev" size="lg" />
          </View>
        </Section>

        <Section title="CusImage">
          <CusImage source={{ uri: "https://picsum.photos/600/300" }} className="h-40 w-full rounded-xl" />
        </Section>

        <Section title="CusSkeleton">
          <CusCard>
            <View className="flex-row items-center gap-3">
              <CusSkeleton className="h-12 w-12 rounded-full" />
              <View className="gap-2">
                <CusSkeleton className="h-4 w-40" />
                <CusSkeleton className="h-3 w-24" />
              </View>
            </View>
          </CusCard>
        </Section>

        <Section title="CusEmptyState">
          <CusCard>
            <CusEmptyState
              title="Hech narsa topilmadi"
              description="Qidiruv shartlarini o'zgartirib ko'ring"
              actionLabel="Qayta urinish"
              onAction={() => setFilter("Barchasi")}
            />
          </CusCard>
        </Section>
      </ScrollView>
    </View>
  );
}
