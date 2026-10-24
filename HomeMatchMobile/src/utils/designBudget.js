// Pure utility used by the budget planner; currency arithmetic uses integer satang.
function parseBudget(text) {
  if (typeof text !== 'string') return {value:null,error:'งบประมาณไม่ถูกต้อง'};
  const input = text.trim();
  if (!input) return {value:null,error:''};
  if (!/^\d+(\.\d{1,2})?$/.test(input)) return {value:null,error:'กรอกตัวเลขไม่ติดลบและทศนิยมไม่เกิน 2 ตำแหน่ง'};
  const value = Number(input);
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100))) return {value:null,error:'งบประมาณเกินขอบเขตที่รองรับ'};
  return {value,error:''};
}
function calculateBudget(total, budget) {
  if (budget === null) return null;
  if (![total,budget].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)))) return null;
  const totalCents = Math.round(total * 100), budgetCents = Math.round(budget * 100);
  const over = totalCents > budgetCents;
  return {remaining:Math.max(0,budgetCents - totalCents) / 100,overBudget:Math.max(0,totalCents - budgetCents) / 100,
    isOverBudget:over,progress:budgetCents === 0 ? (totalCents > 0 ? 1 : 0) : Math.min(1,totalCents / budgetCents),
    percentage:budgetCents === 0 ? null : (totalCents / budgetCents) * 100};
}
module.exports = {parseBudget,calculateBudget};