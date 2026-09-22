import CalendarApp from "../../../components/CalendarApp";

export default async function Page({ params }) {
  const { token } = await params;
  return <CalendarApp token={token} />;
}
