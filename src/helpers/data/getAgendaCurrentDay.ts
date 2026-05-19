import { getAgendaDays } from "./getAgenda";

export async function getAgendaCurrentDay() {
  const rawAgendaDays = await getAgendaDays();

  if (rawAgendaDays.length === 0) {
    throw new Error("No agenda data available");
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const currentConferenceDay = rawAgendaDays.find(
    (day) => day.slug === currentDate,
  );

  if (currentConferenceDay) {
    return `/agenda/${currentDate}`;
  }

  const firstDaySlug =
    rawAgendaDays[0].slug ||
    new Date(rawAgendaDays[0].date).toISOString().split("T")[0];
  return `/agenda/${firstDaySlug}`;
}
