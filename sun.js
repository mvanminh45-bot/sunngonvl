// ... (giữ nguyên toàn bộ code cũ) ...

// THÊM ENDPOINT MỚI: /sun/dashboard
app.get('/sun/dashboard', async (req, res) => {
  try {
    // Lấy dữ liệu mới nhất để verify
    const data = await fetchData();
    if (data && data.data) {
      await verifyPredictions('b52', data.data);
    }

    const history = predictionHistory.b52;
    const stats = learningData.b52;
    const streak = stats.streakAnalysis;
    const reversal = stats.reversalState || { active: false, totalReversals: 0 };

    // Tính toán thống kê
    let wins = 0, losses = 0;
    const verifiedHistory = history.filter(r => {
      const pred = stats.predictions.find(p => p.phien === r.phien_hien_tai);
      return pred && pred.verified;
    });

    verifiedHistory.forEach(r => {
      const pred = stats.predictions.find(p => p.phien === r.phien_hien_tai);
      if (pred && pred.isCorrect) wins++;
      else if (pred && !pred.isCorrect) losses++;
    });

    const totalVerified = wins + losses;
    const winRate = totalVerified > 0 ? (wins / totalVerified * 100).toFixed(1) : 'N/A';

    // Lấy 10 phiên gần nhất
    const recent = history.slice(0, 10).map(r => {
      const pred = stats.predictions.find(p => p.phien === r.phien_hien_tai);
      const isVerified = pred && pred.verified;
      const isCorrect = pred && pred.isCorrect;
      let status = '⏳ Chờ';
      let color = 'gray';
      if (isVerified) {
        if (isCorrect) {
          status = '✅ THẮNG';
          color = 'green';
        } else {
          status = '❌ THUA';
          color = 'red';
        }
      }
      return {
        phien: r.phien_hien_tai,
        du_doan: r.du_doan.toUpperCase(),
        thuc_te: pred && pred.verified ? pred.actual : '---',
        status,
        color,
        confidence: r.ti_le || 'N/A',
        timestamp: r.timestamp
      };
    });

    // Tạo bảng điều khiển
    const dashboard = {
      title: '📊 BẢNG ĐIỀU KHIỂN SUN TÀI XỈU',
      updated: new Date().toISOString(),
      summary: {
        total_phien: history.length,
        verified: totalVerified,
        wins,
        losses,
        win_rate: winRate + '%',
        current_win_streak: streak.currentStreak > 0 ? streak.currentStreak : 0,
        current_loss_streak: streak.currentStreak < 0 ? Math.abs(streak.currentStreak) : 0,
        best_win_streak: streak.bestStreak || 0,
        worst_loss_streak: Math.abs(streak.worstStreak || 0),
        auto_reversal_active: reversal.active ? '✅ BẬT' : '❌ TẮT',
        auto_reversal_count: reversal.totalReversals || 0
      },
      recent: recent,
      raw_stats: stats // giữ nguyên để debug nếu cần
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Lỗi tạo dashboard' });
  }
});

// CẬP NHẬT ENDPOINT /sun/lichsu để trả về dạng bảng HTML nếu query ?format=html
app.get('/sun/lichsu', async (req, res) => {
  const format = req.query.format || 'json';
  
  try {
    const data = await fetchData();
    if (data && data.data) {
      await verifyPredictions('b52', data.data);
    }
    
    const historyWithStatus = predictionHistory.b52.map(record => {
      const prediction = learningData.b52.predictions.find(p => p.phien === record.phien);
      let status = null;
      let ket_qua_thuc_te = null;
      let isCorrect = null;
      
      if (prediction && prediction.verified) {
        isCorrect = prediction.isCorrect;
        status = isCorrect ? '✅' : '❌';
        ket_qua_thuc_te = prediction.actual;
      }
      
      return {
        phien: record.phien_hien_tai,
        du_doan: record.du_doan,
        ti_le: record.ti_le,
        ket_qua_thuc_te,
        status,
        isCorrect,
        timestamp: record.timestamp
      };
    });

    // Nếu yêu cầu HTML, trả về giao diện bảng
    if (format === 'html') {
      const rows = historyWithStatus.slice(0, 20).map(r => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.phien}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${r.du_doan === 'tai' ? '#00cc00' : '#ff3333'};">${r.du_doan.toUpperCase()}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.ket_qua_thuc_te || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.status || '⏳'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.ti_le}</td>
        </tr>
      `).join('');

      const total = historyWithStatus.length;
      const wins = historyWithStatus.filter(r => r.isCorrect === true).length;
      const losses = historyWithStatus.filter(r => r.isCorrect === false).length;
      const winRate = (wins + losses) > 0 ? (wins / (wins + losses) * 100).toFixed(1) : 'N/A';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>📊 Sun Tài Xỉu - Lịch sử</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', monospace; }
            body { background: #0a0a1a; color: #e0e0e0; padding: 20px; display: flex; justify-content: center; }
            .container { max-width: 900px; width: 100%; background: #12122a; border-radius: 16px; padding: 24px; border: 1px solid #2a2a5a; box-shadow: 0 0 40px rgba(0,100,255,0.1); }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2a2a5a; padding-bottom: 16px; }
            .header h1 { font-size: 28px; color: #66ccff; text-shadow: 0 0 20px rgba(102,204,255,0.3); }
            .header .sub { font-size: 14px; color: #8888bb; margin-top: 4px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 12px; margin-bottom: 20px; }
            .stat-box { background: #1a1a3a; border-radius: 12px; padding: 12px; text-align: center; border: 1px solid #2a2a5a; }
            .stat-box .num { font-size: 24px; font-weight: bold; }
            .stat-box .label { font-size: 11px; color: #8888bb; text-transform: uppercase; letter-spacing: 1px; }
            .green { color: #66ff88; }
            .red { color: #ff6666; }
            .blue { color: #66ccff; }
            .gold { color: #ffcc44; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
            th { background: #1a1a4a; padding: 10px 8px; text-align: left; border: 1px solid #2a2a5a; color: #88aaff; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 8px; border: 1px solid #2a2a5a; }
            tr:nth-child(even) { background: #0e0e26; }
            tr:hover { background: #1a1a4a; }
            .status-win { color: #66ff88; font-weight: bold; }
            .status-loss { color: #ff6666; font-weight: bold; }
            .status-pending { color: #8888bb; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #555577; border-top: 1px solid #1a1a3a; padding-top: 16px; }
            .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .badge-win { background: #1a3a1a; color: #66ff88; border: 1px solid #66ff88; }
            .badge-loss { background: #3a1a1a; color: #ff6666; border: 1px solid #ff6666; }
            .badge-pending { background: #1a1a2a; color: #8888bb; border: 1px solid #555577; }
            .scroll { max-height: 500px; overflow-y: auto; }
            .scroll::-webkit-scrollbar { width: 6px; }
            .scroll::-webkit-scrollbar-track { background: #0a0a1a; }
            .scroll::-webkit-scrollbar-thumb { background: #2a2a5a; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 BẢNG ĐIỀU KHIỂN SUN TÀI XỈU</h1>
              <div class="sub">🔄 Cập nhật: ${new Date().toLocaleString('vi-VN')}</div>
            </div>

            <div class="stats-grid">
              <div class="stat-box"><div class="num blue">${total}</div><div class="label">📦 Tổng phiên</div></div>
              <div class="stat-box"><div class="num green">${wins}</div><div class="label">🟢 Thắng</div></div>
              <div class="stat-box"><div class="num red">${losses}</div><div class="label">🔴 Thua</div></div>
              <div class="stat-box"><div class="num gold">${winRate}%</div><div class="label">📈 Tỷ lệ thắng</div></div>
              <div class="stat-box"><div class="num ${streak.currentStreak >= 0 ? 'green' : 'red'}">${streak.currentStreak >= 0 ? streak.currentStreak : Math.abs(streak.currentStreak)}</div><div class="label">🔥 CHUỖI HIỆN TẠI</div></div>
              <div class="stat-box"><div class="num green">${streak.bestStreak || 0}</div><div class="label">🏆 Thắng dài nhất</div></div>
              <div class="stat-box"><div class="num red">${Math.abs(streak.worstStreak || 0)}</div><div class="label">⚠️ Thua dài nhất</div></div>
              <div class="stat-box"><div class="num ${reversal.active ? 'gold' : 'gray'}">${reversal.active ? '✅ BẬT' : '❌ TẮT'}</div><div class="label">🔄 Auto-Reversal</div></div>
            </div>

            <div style="margin: 12px 0 8px 0; font-weight: bold; color: #88aaff;">📜 LỊCH SỬ GẦN NHẤT (20 phiên)</div>
            <div class="scroll">
              <table>
                <thead>
                  <tr>
                    <th># Phiên</th>
                    <th>Dự đoán</th>
                    <th>Kết quả</th>
                    <th>Đánh giá</th>
                    <th>Độ tin cậy</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>

            <div class="footer">
              ⚡ t.me/CuTools • Dữ liệu tự động cập nhật mỗi 5 giây
            </div>
          </div>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    // JSON mặc định (giữ nguyên)
    res.json({
      type: 'Sun Tài Xỉu',
      history: historyWithStatus,
      total: historyWithStatus.length
    });
  } catch (error) {
    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`<h1>⚠️ Lỗi tải dữ liệu</h1><p>${error.message}</p>`);
    }
    res.json({
      type: 'Sun Tài Xỉu',
      history: predictionHistory.b52,
      total: predictionHistory.b52.length,
      error: 'Không thể cập nhật trạng thái'
    });
  }
});

// GIỮ NGUYÊN PHẦN CÒN LẠI CỦA CODE (app.listen, v.v...)
