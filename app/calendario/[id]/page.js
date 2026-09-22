import CalendarApp from "../../../components/CalendarApp";

export default async function Page({ params }) {
  const { id } = await params;
  return <CalendarApp calendarioId={id} />;
}
