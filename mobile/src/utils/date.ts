export const currentMonth = () => new Date().toISOString().slice(0, 7);

export const readableDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(isoDate));

export const readableMonth = (month: string) => {
  const [year = new Date().getFullYear(), index = 1] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, index - 1, 1));
};
