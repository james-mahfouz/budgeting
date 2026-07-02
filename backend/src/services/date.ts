export const currentMonth = () => new Date().toISOString().slice(0, 7);

export const monthBounds = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};

export const monthLabel = (isoDate: string) => isoDate.slice(0, 7);

