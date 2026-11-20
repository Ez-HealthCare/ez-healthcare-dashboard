"use client";

import { useCallback, useState } from "react";
import { Button, DatePicker, Progress, Radio, Spin, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { adminActions, useAdminData, type DepartmentReportItem } from "@/hooks/use-admin";
import styles from "./admin-workspace.module.css";

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function AdminAnalyticsSection() {
  const [rangeType, setRangeType] = useState<"7d" | "30d" | "all" | "custom">("30d");
  const [startDate, setStartDate] = useState<string | undefined>(
    dayjs().subtract(30, "day").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string | undefined>(dayjs().format("YYYY-MM-DD"));

  const loadData = useCallback(async () => {
    const params = { startDate, endDate };
    const [summary, departments, eta, triage] = await Promise.all([
      adminActions.getReportSummary(params),
      adminActions.getDepartmentReports(params),
      adminActions.getEtaPerformance(params),
      adminActions.getTriageRiskReport(params),
    ]);
    return { summary, departments, eta, triage };
  }, [startDate, endDate]);

  const { data, loading, refresh } = useAdminData(loadData, 30_000);

  const handleRangeChange = (type: "7d" | "30d" | "all") => {
    setRangeType(type);
    if (type === "7d") {
      setStartDate(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
      setEndDate(dayjs().format("YYYY-MM-DD"));
    } else if (type === "30d") {
      setStartDate(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
      setEndDate(dayjs().format("YYYY-MM-DD"));
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  const handleExportCsv = async () => {
    try {
      message.loading({ content: "Đang tạo báo cáo CSV/Excel...", key: "export" });
      const csv = await adminActions.exportReportCsv({ startDate, endDate });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `ez_healthcare_report_${startDate || "all"}_${endDate || "all"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success({ content: "Xuất dữ liệu báo cáo thành công!", key: "export" });
    } catch {
      message.error({ content: "Lỗi khi xuất file báo cáo.", key: "export" });
    }
  };

  const departmentColumns: ColumnsType<DepartmentReportItem> = [
    {
      title: "Mã phòng",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "Khoa / Phòng khám",
      dataIndex: "name",
      key: "name",
      render: (name: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <span style={{ fontSize: 12, color: "#64748b" }}>Tầng {row.floor}</span>
        </div>
      ),
    },
    {
      title: "Loại phòng",
      dataIndex: "roomType",
      key: "roomType",
      width: 160,
      render: (type: string) => {
        const labels: Record<string, string> = {
          CONSULTATION: "Phòng khám",
          PARACLINICAL: "Cận lâm sàng",
          EMERGENCY: "Cấp cứu",
          RECEPTION: "Tiếp đón",
        };
        return <Tag>{labels[type] || type}</Tag>;
      },
    },
    {
      title: "Lượt tiếp nhận ban đầu",
      dataIndex: "totalInitialVisits",
      key: "totalInitialVisits",
      align: "center",
      sorter: (a, b) => a.totalInitialVisits - b.totalInitialVisits,
    },
    {
      title: "Lượt điều phối hiện tại",
      dataIndex: "totalCurrentVisits",
      key: "totalCurrentVisits",
      align: "center",
      sorter: (a, b) => a.totalCurrentVisits - b.totalCurrentVisits,
    },
    {
      title: "Đã hoàn tất",
      dataIndex: "completedVisits",
      key: "completedVisits",
      align: "center",
      sorter: (a, b) => a.completedVisits - b.completedVisits,
      render: (completed: number, row) => (
        <span style={{ color: "#059669", fontWeight: 600 }}>
          {completed}{" "}
          {row.totalCurrentVisits > 0 &&
            `(${Math.round((completed / row.totalCurrentVisits) * 100)}%)`}
        </span>
      ),
    },
    {
      title: "Thời gian phục vụ TB",
      dataIndex: "avgServiceTimeMin",
      key: "avgServiceTimeMin",
      align: "center",
      render: (min: number) => `${min} phút`,
    },
  ];

  const summary = data?.summary;
  const eta = data?.eta;
  const triage = data?.triage;
  const evaluatedCount = eta?.evaluatedCount || 0;

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Báo cáo & Phân tích hiệu suất</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Báo Cáo & Phân Tích Vận Hành</h1>
          <p>
            Đo lường sai số thuật toán ETA, thống kê lưu lượng khoa phòng và phân tầng cấp cứu lâm
            sàng.
          </p>
        </div>
        <div className={styles.quickActions}>
          <Button type="primary" onClick={handleExportCsv}>
            Xuất Báo Cáo (CSV/Excel)
          </Button>
          <Button onClick={() => void refresh()}>Làm mới</Button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Khoảng thời gian:</span>
          <Radio.Group
            value={rangeType}
            onChange={(e) => {
              if (e.target.value !== "custom") {
                handleRangeChange(e.target.value);
              } else {
                setRangeType("custom");
              }
            }}
            buttonStyle="solid"
          >
            <Radio.Button value="7d">7 ngày qua</Radio.Button>
            <Radio.Button value="30d">30 ngày qua</Radio.Button>
            <Radio.Button value="all">Tất cả</Radio.Button>
            <Radio.Button value="custom">Tùy chọn</Radio.Button>
          </Radio.Group>

          {rangeType === "custom" && (
            <RangePicker
              format="DD/MM/YYYY"
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setStartDate(dates[0].format("YYYY-MM-DD"));
                  setEndDate(dates[1].format("YYYY-MM-DD"));
                }
              }}
            />
          )}
        </div>
      </div>

      {loading && !data ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 1. TOP KPI SUMMARY */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statTitle}>Tổng lượt khám tiếp nhận</span>
              <span className={styles.statValue}>{summary?.totalVisits || 0}</span>
              <span className={styles.statDesc}>
                {summary?.uniquePatients || 0} bệnh nhân duy nhất
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statTitle}>Ca Cấp Cứu STAT</span>
              <span className={styles.statValue} style={{ color: "#dc2626" }}>
                {summary?.statEmergencyCount || 0}
              </span>
              <span className={styles.statDesc}>Tỷ lệ cấp cứu: {summary?.emergencyRate || 0}%</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statTitle}>Sai số ETA trung bình (MAE)</span>
              <span className={styles.statValue} style={{ color: "#2563eb" }}>
                {eta?.maeMinutes ? `${eta.maeMinutes}m` : "0m"}
              </span>
              <span className={styles.statDesc}>{evaluatedCount} lượt dự báo hoàn tất thực tế</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statTitle}>Dự báo chuẩn (±3 phút)</span>
              <span className={styles.statValue} style={{ color: "#059669" }}>
                {eta?.within3MinRate || 0}%
              </span>
              <span className={styles.statDesc}>
                Đạt chuẩn ±5 phút: {eta?.within5MinRate || 0}%
              </span>
            </div>
          </div>

          {/* 2. ETA PERFORMANCE CARD */}
          <div className={styles.tableCard}>
            <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
              Đánh Giá Hiệu Suất Thuật Toán Dự Báo ETA Sảnh (Queue Engine)
            </Title>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
              So sánh giữa thời gian chờ ước tính của hệ thống $M/M/c$ tại thời điểm phát số và thời
              gian bắt đầu phục vụ thực tế của bệnh nhân tại quầy tiếp nhận.
            </p>

            <div className={styles.analyticsGrid}>
              <div className={styles.metricCard}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                  Chỉ Số Thời Gian Chờ & Độ Lệch
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Thời gian chờ thực tế TB:</span>
                      <strong>{eta?.avgActualWaitMinutes || 0} phút</strong>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Thời gian chờ dự báo TB:</span>
                      <strong>{eta?.avgEstimatedWaitMinutes || 0} phút</strong>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Độ sai lệch tuyệt đối trung bình (MAE):</span>
                      <strong style={{ color: "#2563eb" }}>{eta?.maeMinutes || 0} phút</strong>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Tỷ lệ chính xác trong dung sai ±3 phút:</span>
                      <strong style={{ color: "#059669" }}>{eta?.within3MinRate || 0}%</strong>
                    </div>
                    <Progress
                      percent={eta?.within3MinRate || 0}
                      strokeColor="#059669"
                      size="small"
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Tỷ lệ chính xác trong dung sai ±5 phút:</span>
                      <strong style={{ color: "#16a34a" }}>{eta?.within5MinRate || 0}%</strong>
                    </div>
                    <Progress
                      percent={eta?.within5MinRate || 0}
                      strokeColor="#16a34a"
                      size="small"
                      showInfo={false}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                  Phân Bố Sai Số Dự Báo (Error Histogram)
                </div>
                <div className={styles.distBarContainer}>
                  <div className={styles.distBarRow}>
                    <span className={styles.distBarLabel}>Sai số ≤ 3 phút:</span>
                    <div className={styles.distBarTrack}>
                      <div
                        className={styles.distBarFill}
                        style={{
                          background: "#059669",
                          width: `${
                            evaluatedCount > 0
                              ? ((eta?.distribution.under3Min || 0) / evaluatedCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className={styles.distBarValue}>
                      {eta?.distribution.under3Min || 0} ca
                    </span>
                  </div>

                  <div className={styles.distBarRow}>
                    <span className={styles.distBarLabel}>Sai số 3 - 5 phút:</span>
                    <div className={styles.distBarTrack}>
                      <div
                        className={styles.distBarFill}
                        style={{
                          background: "#2563eb",
                          width: `${
                            evaluatedCount > 0
                              ? ((eta?.distribution.from3To5Min || 0) / evaluatedCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className={styles.distBarValue}>
                      {eta?.distribution.from3To5Min || 0} ca
                    </span>
                  </div>

                  <div className={styles.distBarRow}>
                    <span className={styles.distBarLabel}>Sai số 5 - 10 phút:</span>
                    <div className={styles.distBarTrack}>
                      <div
                        className={styles.distBarFill}
                        style={{
                          background: "#f59e0b",
                          width: `${
                            evaluatedCount > 0
                              ? ((eta?.distribution.from5To10Min || 0) / evaluatedCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className={styles.distBarValue}>
                      {eta?.distribution.from5To10Min || 0} ca
                    </span>
                  </div>

                  <div className={styles.distBarRow}>
                    <span className={styles.distBarLabel}>Sai số &gt; 10 phút:</span>
                    <div className={styles.distBarTrack}>
                      <div
                        className={styles.distBarFill}
                        style={{
                          background: "#ef4444",
                          width: `${
                            evaluatedCount > 0
                              ? ((eta?.distribution.over10Min || 0) / evaluatedCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className={styles.distBarValue}>
                      {eta?.distribution.over10Min || 0} ca
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. CLINICAL TRIAGE RISK & STAT PREVALENCE */}
          <div className={styles.tableCard}>
            <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
              Phân Tầng Nguy Cơ Lâm Sàng (NEWS2 Score & Cờ Đỏ Cấp Cứu)
            </Title>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
              Tổng hợp phân tầng nguy cơ của bệnh nhân từ quy trình ghi nhận sinh hiệu trước khám.
            </p>

            <div className={styles.analyticsGrid}>
              <div className={styles.metricCard}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                  Phân Tầng Nguy Cơ NEWS2
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Nguy cơ Thấp (NEWS2: 0 - 4):</span>
                      <strong>
                        {triage?.riskTiers.low.count || 0} ({triage?.riskTiers.low.percentage || 0}
                        %)
                      </strong>
                    </div>
                    <Progress
                      percent={triage?.riskTiers.low.percentage || 0}
                      strokeColor="#059669"
                      size="small"
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Nguy cơ Trung Bình (NEWS2: 5 - 6):</span>
                      <strong>
                        {triage?.riskTiers.medium.count || 0} (
                        {triage?.riskTiers.medium.percentage || 0}%)
                      </strong>
                    </div>
                    <Progress
                      percent={triage?.riskTiers.medium.percentage || 0}
                      strokeColor="#f59e0b"
                      size="small"
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Nguy cơ Cao (NEWS2 ≥ 7):</span>
                      <strong>
                        {triage?.riskTiers.high.count || 0} (
                        {triage?.riskTiers.high.percentage || 0}%)
                      </strong>
                    </div>
                    <Progress
                      percent={triage?.riskTiers.high.percentage || 0}
                      strokeColor="#dc2626"
                      size="small"
                      showInfo={false}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                  Cờ Đỏ Cấp Cứu (STAT Red Flags)
                </div>
                <div>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    Tổng số ca kích hoạt cờ đỏ:{" "}
                    <strong style={{ color: "#dc2626" }}>
                      {triage?.redFlags.count || 0} lượt ({triage?.redFlags.percentage || 0}%)
                    </strong>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {Object.entries(triage?.redFlags.reasons || {}).map(([reason, count]) => (
                      <Tag key={reason} color="red" style={{ padding: "4px 8px" }}>
                        {reason}: {count} ca
                      </Tag>
                    ))}
                    {Object.keys(triage?.redFlags.reasons || {}).length === 0 && (
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>
                        Không có ca cấp cứu cờ đỏ trong kỳ
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. DEPARTMENT BREAKDOWN TABLE */}
          <div className={styles.tableCard}>
            <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
              Lưu Lượng & Tỷ Lệ Hoàn Tất Theo Khoa / Phòng Khám
            </Title>
            <Table
              dataSource={data?.departments || []}
              columns={departmentColumns}
              rowKey="id"
              pagination={false}
              bordered
            />
          </div>
        </>
      )}
    </>
  );
}
