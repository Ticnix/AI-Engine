"use client";

import { Checkbox, Tag, Empty, Spin, Input } from "antd";
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";


interface Document {
  id: string;
  originalName: string;
  type: string;
  status: string;
}

interface DocumentSelectorProps {
  documents: Document[];
  selectedDocIds: string[];
  onChange: (selectedIds: string[]) => void;
  loading?: boolean;
}

const themes = {
  dark: {
    accentColor: "#00ffaa",
    accentBg: "rgba(0, 255, 170, 0.06)",
    accentBorder: "rgba(0, 255, 170, 0.2)",
    hoverBg: "rgba(0, 255, 170, 0.04)",
    selectedBg: "rgba(0, 255, 170, 0.08)",
    selectedHoverBg: "rgba(0, 255, 170, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    headerBg: "rgba(0, 0, 0, 0.2)",
    textPrimary: "rgba(255, 255, 255, 0.85)",
    textSecondary: "rgba(255, 255, 255, 0.45)",
    textTertiary: "rgba(255, 255, 255, 0.25)",
    cardBg: "rgba(255, 255, 255, 0.02)",
    iconBg: "rgba(255, 255, 255, 0.04)",
    iconBorder: "rgba(255, 255, 255, 0.06)",
    searchBg: "rgba(255, 255, 255, 0.03)",
    inputText: "rgba(255, 255, 255, 0.85)",
    inputPlaceholder: "rgba(255, 255, 255, 0.3)",
    dividerBorder: "rgba(255, 255, 255, 0.06)",
    emptyColor: "rgba(255, 255, 255, 0.3)",
    rowBorderTransparent: "transparent",
  },
  light: {
    accentColor: "#1890ff",
    accentBg: "rgba(24, 144, 255, 0.06)",
    accentBorder: "rgba(24, 144, 255, 0.2)",
    hoverBg: "rgba(24, 144, 255, 0.04)",
    selectedBg: "rgba(24, 144, 255, 0.08)",
    selectedHoverBg: "rgba(24, 144, 255, 0.12)",
    borderColor: "rgba(0, 0, 0, 0.06)",
    headerBg: "rgba(0, 0, 0, 0.02)",
    textPrimary: "rgba(0, 0, 0, 0.85)",
    textSecondary: "rgba(0, 0, 0, 0.45)",
    textTertiary: "rgba(0, 0, 0, 0.25)",
    cardBg: "#fafbfc",
    iconBg: "rgba(0, 0, 0, 0.03)",
    iconBorder: "rgba(0, 0, 0, 0.06)",
    searchBg: "#fff",
    inputText: "rgba(0, 0, 0, 0.85)",
    inputPlaceholder: "rgba(0, 0, 0, 0.25)",
    dividerBorder: "rgba(0, 0, 0, 0.06)",
    emptyColor: "rgba(0, 0, 0, 0.25)",
    rowBorderTransparent: "transparent",
  },
};

export default function DocumentSelector({
  documents,
  selectedDocIds,
  onChange,
  loading = false,
}: DocumentSelectorProps) {
  const t = themes.light;
  const [searchKeyword, setSearchKeyword] = useState("");

  // 只显示已向量化的文档
  const vectorizedDocuments = useMemo(
    () => documents.filter((doc) => doc.status === "embedding"),
    [documents]
  );

  const { selectedDocs, unselectedDocs } = useMemo(() => {
    const filtered = vectorizedDocuments.filter((doc) =>
      doc.originalName.toLowerCase().includes(searchKeyword.toLowerCase())
    );
    return {
      selectedDocs: filtered.filter((doc) => selectedDocIds.includes(doc.id)),
      unselectedDocs: filtered.filter((doc) => !selectedDocIds.includes(doc.id)),
    };
  }, [vectorizedDocuments, selectedDocIds, searchKeyword]);

  const toggleDoc = (docId: string) => {
    const isSelected = selectedDocIds.includes(docId);
    onChange(
      isSelected
        ? selectedDocIds.filter((id) => id !== docId)
        : [...selectedDocIds, docId]
    );
  };

  const selectAll = (docs: Document[]) => {
    const ids = docs.map((d) => d.id);
    const newIds = [...new Set([...selectedDocIds, ...ids])];
    onChange(newIds);
  };

  const deselectAll = (docs: Document[]) => {
    const ids = new Set(docs.map((d) => d.id));
    onChange(selectedDocIds.filter((id) => !ids.has(id)));
  };

  const isAllSelected = (docs: Document[]) =>
    docs.length > 0 && docs.every((d) => selectedDocIds.includes(d.id));

  const isSomeSelected = (docs: Document[]) =>
    docs.some((d) => selectedDocIds.includes(d.id)) && !isAllSelected(docs);

  const renderDocRow = (doc: Document) => {
    const isSelected = selectedDocIds.includes(doc.id);
    return (
      <div
        key={doc.id}
        onClick={() => toggleDoc(doc.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          margin: "2px 8px",
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.15s ease",
          background: isSelected ? t.selectedBg : "transparent",
          border: `1px solid ${isSelected ? t.accentBorder : t.rowBorderTransparent}`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = isSelected ? t.selectedHoverBg : t.hoverBg;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = isSelected ? t.selectedBg : "transparent";
        }}
      >
        <Checkbox
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 0 }}
        />
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isSelected ? `${t.accentColor}15` : t.iconBg,
            border: `1px solid ${isSelected ? t.accentBorder : t.iconBorder}`,
            flexShrink: 0,
          }}
        >
          <FileTextOutlined
            style={{
              fontSize: 14,
              color: isSelected ? t.accentColor : t.textTertiary,
            }}
          />
        </div>
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: isSelected ? t.textPrimary : t.textSecondary,
            fontSize: 13,
            fontWeight: isSelected ? 500 : 400,
          }}
          title={doc.originalName}
        >
          {doc.originalName}
        </span>
        <Tag
          color={doc.status === "embedding" ? "success" : "warning"}
          style={{
            margin: 0,
            fontSize: 11,
            padding: "0 8px",
            lineHeight: "20px",
            borderRadius: 4,
            border: "none",
            flexShrink: 0,
          }}
        >
          {doc.status === "embedding" ? (
            <CheckCircleOutlined style={{ marginRight: 2 }} />
          ) : (
            <ClockCircleOutlined style={{ marginRight: 2 }} />
          )}
          {doc.status === "embedding" ? "已向量" : "待向量"}
        </Tag>
      </div>
    );
  };

  const renderSection = (
    title: string,
    docs: Document[],
  ) => {
    if (docs.length === 0 && searchKeyword) return null;
    if (docs.length === 0) return null;

    const isTopSection = title === "已关联文档";

    return (
      <div style={{ marginBottom: docs.length > 0 ? 4 : 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: t.headerBg,
            borderRadius: 8,
            margin: "0 8px",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isTopSection && (
              <div
                style={{
                  width: 4,
                  height: 14,
                  borderRadius: 2,
                  background: t.accentColor,
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                color: isTopSection ? t.accentColor : t.textSecondary,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {title}
              <span style={{ color: t.textTertiary, marginLeft: 6, fontWeight: 400 }}>
                {docs.length} 个文档
              </span>
            </span>
          </div>
          {docs.length > 1 && (
            <Checkbox
              checked={isAllSelected(docs)}
              indeterminate={isSomeSelected(docs)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => {
                if (isAllSelected(docs)) {
                  deselectAll(docs);
                } else {
                  selectAll(docs);
                }
              }}
              style={{
                color: t.accentColor,
                fontSize: 12,
              }}
            >
              全选
            </Checkbox>
          )}
        </div>
        <div style={{ padding: "2px 0" }}>
          {docs.map(renderDocRow)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin style={{ color: t.accentColor }} />
        <div style={{ color: t.textSecondary, marginTop: 12, fontSize: 13 }}>
          加载文档中...
        </div>
      </div>
    );
  }

  if (vectorizedDocuments.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Empty
          description={
            documents.length === 0
              ? "暂无可用文档，请先上传并处理文档"
              : "当前没有已向量化的文档，请先对文档进行向量化处理"
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          imageStyle={{ height: 60 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: 580,
      }}
    >
      {/* 搜索框 */}
      <Input
        prefix={
          <SearchOutlined style={{ color: t.textTertiary, marginRight: 4 }} />
        }
        placeholder="搜索文档名称..."
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        allowClear
        size="middle"
        style={{
          borderRadius: 10,
          border: `1px solid ${t.borderColor}`,
          background: t.searchBg,
          marginBottom: 12,
          height: 40,
        }}
        styles={{
          input: {
            color: t.inputText,
            background: "transparent",
          },
        }}
      />

      {/* 文档列表 */}
      <div
        style={{
          border: `1px solid ${t.borderColor}`,
          borderRadius: 12,
          overflowY: "auto",
          flex: 1,
          maxHeight: 440,
          background: t.cardBg,
        }}
      >
        {renderSection("已关联文档", selectedDocs)}
        {renderSection("其他文档", unselectedDocs)}

        {!searchKeyword && selectedDocs.length === 0 && unselectedDocs.length > 0 && (
          <div style={{ padding: 16, textAlign: "center", borderTop: `1px dashed ${t.dividerBorder}` }}>
            <span style={{ color: t.textSecondary, fontSize: 12 }}>
              选择已向量化的文档作为知识库
            </span>
          </div>
        )}
      </div>

      {/* 底部摘要 */}
      {selectedDocIds.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 14px",
            background: t.accentBg,
            borderRadius: 10,
            border: `1px solid ${t.accentBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: t.accentColor, fontSize: 13 }}>
            已选择 <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedDocIds.length}</span> 个文档
          </span>
          <span
            onClick={() => onChange([])}
            style={{
              color: t.textSecondary,
              fontSize: 12,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = t.accentColor; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = t.textSecondary; }}
          >
            清除选择
          </span>
        </div>
      )}
    </div>
  );
}
