import { getHazardColor } from '../hazardTheme';

const SEVERITY_LABEL = { high: 'Critical', medium: 'Elevated', low: 'Low' };

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return ts || '';
  }
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function buildAlertsCsv(alerts) {
  const header = [
    'Alert ID',
    'Timestamp',
    'Node ID',
    'Node Name',
    'Zone',
    'Hazard Type',
    'Severity',
    'Confidence (%)',
    'Primary Reading',
    'Secondary Reading',
    'AI Explanation',
    'Recipient'
  ];

  const rows = alerts.map((a) => [
    a.id,
    formatTime(a.timestamp),
    a.node_id,
    a.node_name,
    a.zone,
    a.hazard_label || a.hazard_type,
    (SEVERITY_LABEL[a.severity] || a.severity || '').toUpperCase(),
    Math.round((a.confidence || 0) * 100),
    a.primary_value,
    a.secondary_value,
    a.explanation,
    a.recipient
  ].map(escapeCsv).join(','));

  return '\ufeff' + [header.join(','), ...rows].join('\r\n');
}

export function exportAlertsCsv(alerts, fileName) {
  const name = fileName || `beacon-incident-report-${stamp()}.csv`;
  const blob = new Blob([buildAlertsCsv(alerts)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildPdfHtml(alerts) {
  const total = alerts.length;
  const critical = alerts.filter((a) => a.severity === 'high').length;
  const elevated = alerts.filter((a) => a.severity === 'medium').length;
  const dual = alerts.filter((a) => (a.recipient || '').includes('Dual Dispatch')).length;
  const citizen = alerts.filter((a) => (a.recipient || '').includes('Citizen Advisory')).length;
  const watchlist = alerts.filter((a) => (a.recipient || '').includes('Watchlist')).length;

  const kpi = (label, value, color = '#1A2126') => `
    <div class="kpi">
      <div class="n" style="color:${color}">${value}</div>
      <div class="l">${label}</div>
    </div>`;

  let rowsHtml;
  if (total === 0) {
    rowsHtml = `<tr><td colspan="9" class="empty">No incident alerts in the current report window.</td></tr>`;
  } else {
    rowsHtml = alerts.map((a) => {
      const sev = a.severity === 'high' ? 'sev-high' : 'sev-medium';
      return `
        <tr>
          <td class="mono">${formatTime(a.timestamp)}</td>
          <td>
            <span class="hazard-dot" style="background:${getHazardColor(a.hazard_type)}"></span>
            <span class="mono">${a.node_id}</span>
          </td>
          <td><strong>${a.node_name}</strong><br/><span class="dim">${a.zone}</span></td>
          <td>${a.hazard_label || a.hazard_type}</td>
          <td class="${sev}">${(SEVERITY_LABEL[a.severity] || a.severity || '').toUpperCase()}</td>
          <td class="mono">${a.primary_value}</td>
          <td class="mono">${a.secondary_value}</td>
          <td class="explain">${a.explanation || ''}</td>
          <td>${a.recipient}</td>
        </tr>`;
    }).join('');
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>BEACON Incident Alerts Report — ${stamp()}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1A2126; margin: 0; font-size: 12px; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #3457D5; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { font-size: 20px; font-weight: 700; color: #3457D5; }
  .brand .dark { color: #1A2126; }
  .sub { font-size: 11px; color: #6B7684; margin-top: 3px; }
  .generated { font-size: 11px; color: #6B7684; text-align: right; }
  .kpis { display: flex; gap: 10px; margin: 0 0 14px; }
  .kpi { flex: 1; border: 1px solid #E3E7EC; border-radius: 6px; padding: 8px 10px; background: #FFFFFF; }
  .kpi .n { font-size: 22px; font-weight: 700; }
  .kpi .l { font-size: 10px; color: #6B7684; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #F1F3F6; text-align: left; padding: 6px 8px; border-bottom: 2px solid #E3E7EC; font-size: 9.5px; text-transform: uppercase; color: #6B7684; letter-spacing: 0.4px; }
  td { padding: 6px 8px; border-bottom: 1px solid #EDEFF2; vertical-align: top; }
  .mono { font-family: Consolas, monospace; }
  .dim { color: #6B7684; font-size: 10px; }
  .sev-high { color: #D9364A; font-weight: 700; }
  .sev-medium { color: #B26A00; font-weight: 700; }
  .explain { font-size: 10px; font-style: italic; color: #1A2126; max-width: 220px; }
  .hazard-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; vertical-align: baseline; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-high { background: #D9364A; color: #FFFFFF; }
  .badge-medium { background: #FFF6E0; color: #B26A00; border: 1px solid #D48806; }
  .empty { padding: 22px; text-align: center; color: #6B7684; }
  .footer { margin-top: 14px; font-size: 10px; color: #9AA4AE; border-top: 1px solid #E3E7EC; padding-top: 8px; display: flex; justify-content: space-between; }
  .print-btn { margin-bottom: 12px; background: #3457D5; color: #FFFFFF; border: 0; border-radius: 4px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="report-header">
    <div>
      <div class="brand">BEACON <span class="dark">· Incident Alert Report</span></div>
      <div class="sub">AI-Powered Multi-Hazard Environmental Intelligence Network &mdash; SIH26178 / Qualcomm</div>
    </div>
    <div class="generated">
      Generated: <strong>${formatTime(new Date().toISOString())}</strong><br/>
      Alert window: current operations console feed
    </div>
  </div>
  <div class="kpis">
    ${kpi('Total incidents', total)}
    ${kpi('Critical (high risk)', critical, '#D9364A')}
    ${kpi('Elevated (medium risk)', elevated, '#B26A00')}
    ${kpi('Dual dispatch', dual)}
    ${kpi('Citizen advisories', citizen)}
    ${kpi('Watchlist entries', watchlist)}
  </div>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Node</th>
        <th>Location</th>
        <th>Hazard</th>
        <th>Severity</th>
        <th>Primary</th>
        <th>Secondary</th>
        <th>AI explanation</th>
        <th>Dispatch recipient</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">
    <span>BEACON Environmental Intelligence Network &mdash; SIH26178 / Qualcomm</span>
    <span>Report ID: ${'INC-' + Date.now().toString(36).toUpperCase()}</span>
  </div>
</body>
</html>`;
}

export function openAlertsPdf(alerts) {
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return;
  win.document.open();
  win.document.write(buildPdfHtml(alerts));
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch (e) {
      // Browser may block scripted print; the in-report button remains available.
    }
  }, 600);
}