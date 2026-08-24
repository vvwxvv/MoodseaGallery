"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { Controller } from "react-hook-form";
import useRelationOptions from "@/hooks/useRelationOptions";
import useFont from "@/hooks/useFont";

/**
 * MultiRelationSelector — plain-HTML cross-entity multi-select (no MUI Autocomplete,
 * no styled-wrapper, so no "unique key" warnings).
 *
 * - Dropdown of related items (fetched via useRelationOptions, language-matched, de-duped)
 * - Multi-select via click-to-toggle rows (no checkbox, monochrome)
 * - Free-text input: type a custom value + Enter (or the "+" button) to add it
 * - Selected values shown as removable chips
 * - Binds to a React-Hook-Form `string[]` field
 *
 * @param {string}   name        RHF field name (array of strings)
 * @param {string}   label       field label
 * @param {object}   control     RHF control
 * @param {object|object[]} sources   relation source config(s) — see useRelationOptions
 * @param {array}    options     optional pre-fetched options (overrides `sources`)
 * @param {string}   placeholder
 * @param {boolean}  disabled
 * @param {boolean}  isCn
 * @param {object}   colors      { text, secondaryText, background, border, chipBackground, chipText }
 * @param {string}   hint        helper text under the field
 * @param {function} onChange    extra callback (receives the string[] value)
 */
const MultiRelationSelector = ({
  name,
  label,
  control,
  sources,
  options: optionsProp,
  placeholder,
  disabled = false,
  isCn = false,
  colors = {},
  hint,
  onChange,
}) => {
  const { inputFontFamily, labelFontFamily } = useFont();

  const sourceList = useMemo(
    () => (Array.isArray(sources) ? sources : sources ? [sources] : []),
    [sources]
  );
  const fetched = useRelationOptions(sourceList, isCn);

  const options = useMemo(() => optionsProp ?? fetched.options, [optionsProp, fetched.options]);
  const loading = optionsProp ? false : fetched.loading;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customText, setCustomText] = useState("");
  const wrapperRef = useRef(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(term));
  }, [options, searchTerm]);

  // ── style helpers (plain inline styles, no CSS-in-JS wrappers) ──────────
  const textColor = colors?.text || "#2c2c2c";
  const secondaryText = colors?.secondaryText || "#6b7280";
  const bg = colors?.background || "#fff";
  const border = colors?.border || "#d9d9d9";
  const chipBg = colors?.chipBackground || "#e5e7eb";
  const chipText = colors?.chipText || "#1f2937";

  const renderChip = useCallback(
    (value) => {
      const opt = options.find((o) => o.value === value || o.label === value);
      const displayLabel = opt ? opt.label : value;
      return (
        <span
          style={{
            backgroundColor: chipBg,
            color: chipText,
            fontFamily: inputFontFamily,
            fontSize: "13px",
            padding: "4px 10px",
            borderRadius: "999px",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {displayLabel}
        </span>
      );
    },
    [options, chipBg, chipText, inputFontFamily]
  );

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={[]}
      render={({ field }) => {
        const value = Array.isArray(field.value) ? field.value : [];
        const setValue = (next) => {
          field.onChange(next);
          onChange?.(next);
        };

        const toggle = (opt) => {
          const v = opt.value ?? opt.label;
          const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
          setValue(next);
        };

        const addCustom = () => {
          const t = customText.trim();
          if (!t || disabled) return;
          if (!value.includes(t)) setValue([...value, t]);
          setCustomText("");
        };

        return (
          <div ref={wrapperRef} className="mb-4" onTouchEnd={(e) => e.stopPropagation()}>
            {label && (
              <label
                className="form-label"
                style={{
                  color: textColor,
                  fontFamily: labelFontFamily,
                  fontSize: "13px",
                  fontWeight: 500,
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                {label}
              </label>
            )}

            {/* Selected chips */}
            {value.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {value.map((v) => (
                  <React.Fragment key={v}>{renderChip(v)}</React.Fragment>
                ))}
              </div>
            )}

            {/* Trigger + dropdown */}
            <div className="relative">
              <div
                onClick={() => !disabled && !loading && setIsOpen((o) => !o)}
                style={{
                  backgroundColor: bg,
                  borderColor: border,
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  cursor: disabled || loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: inputFontFamily,
                  fontSize: "13px",
                  color: textColor,
                }}
              >
                <input
                  type="text"
                  placeholder={placeholder || (isCn ? "选择或输入…" : "Select or type…")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                  }}
                  onFocus={() => !disabled && setIsOpen(true)}
                  disabled={disabled || loading}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    flex: 1,
                    fontFamily: inputFontFamily,
                    fontSize: "13px",
                    color: textColor,
                  }}
                />
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>

              {isOpen && !loading && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "4px",
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderRadius: "8px",
                    zIndex: 50,
                    boxShadow:
                      "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  {/* Custom input row */}
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      padding: "8px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <input
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustom();
                        }
                      }}
                      placeholder={isCn ? "输入自定义值，回车添加" : "Type custom value + Enter"}
                      style={{
                        flex: 1,
                        border: `1px solid ${border}`,
                        borderRadius: "4px",
                        padding: "4px 8px",
                        fontFamily: inputFontFamily,
                        fontSize: "13px",
                        color: textColor,
                        outline: "none",
                        minWidth: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={addCustom}
                      disabled={disabled}
                      style={{
                        border: `1px solid ${border}`,
                        borderRadius: "4px",
                        background: "transparent",
                        cursor: disabled ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 8px",
                        color: textColor,
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Options list */}
                  <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                    {filteredOptions.length === 0 ? (
                      <div
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          color: secondaryText,
                          fontFamily: inputFontFamily,
                        }}
                      >
                        {isCn ? "无选项，可输入自定义值" : "No options — type a custom value"}
                      </div>
                    ) : (
                      filteredOptions.map((opt) => {
                        const v = opt.value ?? opt.label;
                        const checked = value.includes(v);
                        return (
                          <div
                            key={v}
                            onClick={() => toggle(opt)}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              backgroundColor: checked ? "#f3f4f6" : "transparent",
                              fontFamily: inputFontFamily,
                              fontSize: "13px",
                              color: textColor,
                              fontWeight: checked ? 600 : 400,
                            }}
                            className="hover:bg-gray-100 transition-colors"
                          >
                            <span style={{ flex: 1 }}>{opt.label}</span>
                            {checked ? (
                              <span style={{ color: "#000", fontWeight: 700, fontSize: "13px" }}>✓</span>
                            ) : null}
                            {opt.description ? (
                              <span style={{ color: secondaryText, fontSize: "12px", whiteSpace: "nowrap" }}>
                                {opt.description}
                              </span>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hint / count */}
            {(hint || value.length > 0) && (
              <div
                style={{
                  fontSize: "12px",
                  color: secondaryText,
                  marginTop: "4px",
                  fontFamily: labelFontFamily,
                }}
              >
                {hint || `${value.length} ${isCn ? "项已选" : "selected"}`}
              </div>
            )}
          </div>
        );
      }}
    />
  );
};

export default MultiRelationSelector;
