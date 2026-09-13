import React, { useContext, useMemo, useState } from 'react';
import { Tabs, ConfigProvider } from 'antd';
import { useFieldArray } from 'react-hook-form';

import { LanguageContext } from '@/components/contexts/LanguageContext';
import { getSystemLabel } from '@/components/labels/system_labels';
import useFont from '@/hooks/useFont';

import FormTextField from '@/components/forms/fields/FormTextField';
import FormSelectField from '@/components/forms/fields/FormSelectField';
import LanguageSelector, {
  languageOptions,
} from '@/components/forms/selectors/LanguageSelector';
import YearSelector from '@/components/forms/selectors/YearSelector';
import MultiRelationSelector from '@/components/forms/selectors/MultiRelationSelector';
import OrderFieldsDisplay from '@/components/forms/selectors/OrderFieldsDisplay';
import ArrayManager from '@/components/forms/managers/ArrayManager';
import ObjectArrayManager from '@/components/forms/managers/ObjectArrayManager';

const TabbedFormManager = ({
  form,
  schema = [],
  getLabelFunc,
  onFieldChange,
  colors = {},
  disabled = false,
  customRenderers = {},
}) => {
  const { isCn } = useContext(LanguageContext);
  const { inputFontFamily, labelFontFamily } = useFont();
  const [activeTab, setActiveTab] = useState('0');

  const arrayFieldNames = useMemo(() => {
    return schema
      .filter(
        (tab) =>
          (tab.type === 'array' || tab.type === 'object-array') && tab.fieldName
      )
      .map((tab) => tab.fieldName);
  }, [schema]);

  const fieldArraysData = {};
  arrayFieldNames.forEach((fieldName) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    fieldArraysData[fieldName] = useFieldArray({
      control: form.control,
      name: fieldName,
    });
  });

  const getLabel = (key, labelObj) => {
    if (getLabelFunc) return getLabelFunc(key);
    if (labelObj) return labelObj[isCn ? 'cn' : 'en'];
    return getSystemLabel(key, isCn);
  };

  const paletteColor = (key, fallback) => colors?.[key] || fallback;

  const inputStyles = useMemo(
    () => ({
      fontFamily: inputFontFamily,
      color: paletteColor('text') || undefined,
      backgroundColor: paletteColor('background') || undefined,
      borderColor: paletteColor('border') || undefined,
      borderRadius: '8px',
    }),
    [colors, inputFontFamily]
  );

  // Section fields declare a `type`; language fields must be a dropdown
  // ("CN" / "EN"), and `select` fields must be a dropdown too — both used to
  // fall through to a plain text input.
  const resolveSelectOptions = (options) => {
    if (!options) return [];
    if (typeof options === 'string') {
      if (options === 'languageOptions') {
        return languageOptions.map((option) => ({
          value: option.value,
          label: isCn ? option.label_cn : option.label_en,
        }));
      }
      return [];
    }
    return (Array.isArray(options) ? options : []).map((option) =>
      option && typeof option === 'object'
        ? { value: option.value ?? option.label, label: option.label ?? option.value }
        : { value: option, label: String(option) }
    );
  };

  const renderFieldInput = (meta) => {
    const label = getLabel(meta.name, meta.label);

    // Language → shared dropdown (EN / CN), same component everywhere.
    if (meta.type === 'language' || meta.name === 'language') {
      return (
        <LanguageSelector
          key={meta.name}
          form={form}
          name={meta.name}
          disabled={disabled}
          colors={colors}
          isCn={isCn}
          getLabel={(key) =>
            key === 'languagePlaceholder'
              ? isCn
                ? '选择语言'
                : 'Select language...'
              : label
          }
          onFieldChange={() => onFieldChange?.(meta.name)}
        />
      );
    }

    // Year → simple single-value dropdown 1980 … current year.
    if (meta.type === 'year' || (meta.name === 'year' && meta.options !== false)) {
      return (
        <YearSelector
          key={meta.name}
          form={form}
          name={meta.name}
          disabled={disabled}
          colors={colors}
          isCn={isCn}
          getLabel={() => label}
          onFieldChange={() => onFieldChange?.(meta.name)}
        />
      );
    }

    if (meta.type === 'select') {
      return (
        <FormSelectField
          key={meta.name}
          name={meta.name}
          label={label}
          control={form.control}
          error={form.formState.errors[meta.name]}
          disabled={disabled}
          options={resolveSelectOptions(meta.options)}
          colors={colors}
          labelFontFamily={labelFontFamily}
          inputStyles={inputStyles}
          onChange={() => onFieldChange?.(meta.name)}
        />
      );
    }

    return (
      <FormTextField
        key={meta.name}
        name={meta.name}
        label={label}
        control={form.control}
        error={form.formState.errors[meta.name]}
        disabled={disabled}
        multiline={meta.type === 'multiline'}
        rows={meta.rows || 1}
        colors={colors}
        labelFontFamily={labelFontFamily}
        inputStyles={inputStyles}
        onChange={() => onFieldChange?.(meta.name)}
        placeholder={label}
      />
    );
  };

  const renderFieldGroup = (fields) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {fields.map((meta) => renderFieldInput(meta))}
    </div>
  );

  // Cross-entity relation (Prisma `String[]` fields such as
  // Artwork.related_gallery_exhibition) → language-matched multi-select whose
  // options come from the related collection. Configure with:
  //   { type: 'relation', fieldName: 'related_gallery_exhibition',
  //     label: {en,cn},
  //     relation: { endpoint: 'exhibition', labelKey: 'title',
  //                 languageField: 'language', matchLanguage: true,
  //                 descriptionKey: 'year', unique: true },
  //     matchField: 'language',   // read the target language from the form
  //     allowCustom: false }      // only values from the list
  const renderRelationField = (tabConfig) => {
    const relation = tabConfig.relation || {};
    // The record's own language (e.g. an EN artwork) beats the UI language.
    const watched = tabConfig.matchField ? form.watch(tabConfig.matchField) : undefined;
    const language = String(watched || (isCn ? 'CN' : 'EN')).trim().toUpperCase();

    return (
      <MultiRelationSelector
        name={tabConfig.fieldName}
        label={getLabel(tabConfig.fieldName, tabConfig.label)}
        control={form.control}
        sources={relation}
        language={tabConfig.matchField ? language : undefined}
        allowCustom={tabConfig.allowCustom !== false}
        disabled={disabled}
        isCn={isCn}
        colors={colors}
        placeholder={
          tabConfig.placeholder?.[isCn ? 'cn' : 'en'] ||
          (isCn ? '选择或输入…' : 'Select or type…')
        }
        hint={tabConfig.hint?.[isCn ? 'cn' : 'en']}
        onChange={(vals) => onFieldChange?.(tabConfig.fieldName, vals)}
      />
    );
  };

  // Ordering — read-only. The position itself is set on the dedicated order
  // page, so the form only shows the number + a link:
  //   `{ key: 'ordering', type: 'order', entity: 'artwork',
  //      orderPagePath: '/manager/artwork/order' }`
  //   `{ key: 'ordering', type: 'order', fieldName: 'order',
  //      label: {en,cn}, orderPagePath: '/manager/<entity>/reorder' }`
  const renderOrderField = (tabConfig) => (
    <OrderFieldsDisplay
      form={form}
      entity={tabConfig.entity || null}
      fieldName={tabConfig.fieldName || 'order'}
      label={tabConfig.orderLabel || tabConfig.label || null}
      labels={tabConfig.orderKeyLabels || null}
      orderPagePath={tabConfig.orderPagePath || null}
      isCn={isCn}
      colors={colors}
      hint={
        tabConfig.orderHint?.[isCn ? 'cn' : 'en'] ||
        (isCn
          ? '排序在排序页中拖拽调整'
          : 'Positions are arranged on the order page')
      }
    />
  );

  const renderArrayField = (tabConfig) => {
    const fieldArrayData = fieldArraysData[tabConfig.fieldName];
    if (!fieldArrayData) {
      console.error(`No field array data found for ${tabConfig.fieldName}`);
      return null;
    }
    const { fields, append, remove, replace } = fieldArrayData;
    // 直接使用 tabConfig.addLabel，若不存在则通过 getLabel 生成
    const addLabel = tabConfig.addLabel || getLabel(`add${tabConfig.fieldName}`);
    return (
      <ArrayManager
        fields={fields}
        append={append}
        remove={remove}
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
        fieldName={tabConfig.fieldName}
        itemLabel={getLabel(tabConfig.fieldName, tabConfig.label)}
        addButtonLabel={addLabel}
        isSubmitting={disabled}
        rows={tabConfig.rows || 3}
        multiline={tabConfig.multiline || false}
        onChange={(index, value) =>
          onFieldChange?.(`${tabConfig.fieldName}[${index}]`, value)
        }
      />
    );
  };

  const renderObjectArrayField = (tabConfig) => {
    const fieldArrayData = fieldArraysData[tabConfig.fieldName];
    if (!fieldArrayData) {
      console.error(`No field array data found for ${tabConfig.fieldName}`);
      return null;
    }
    const { fields, append, remove, replace } = fieldArrayData;

    const resolvedSubFields = (tabConfig.subFields || []).map((f) => ({
      ...f,
      label: getLabel(f.name, f.label),
    }));

    const addLabel = tabConfig.addLabel || getLabel(`add${tabConfig.fieldName}`);

    return (
      <ObjectArrayManager
        fields={fields}
        append={append}
        remove={remove}
        replace={replace}
        control={form.control}
        errors={form.formState.errors}
        fieldName={tabConfig.fieldName}
        subFields={resolvedSubFields}
        getLabel={(key) => getLabel(key, tabConfig.subFieldLabels?.[key])}
        isSubmitting={disabled}
        addButtonLabel={addLabel}
        minItems={tabConfig.minItems || 0}
        maxItems={tabConfig.maxItems || null}
        allowJsonMode={tabConfig.allowJsonMode !== false}
        colors={colors}
        inputFontFamilyProp={inputFontFamily}
        labelFontFamilyProp={labelFontFamily}
      />
    );
  };

  const renderTabContent = (tabConfig) => {
    if (tabConfig.fields) {
      return renderFieldGroup(tabConfig.fields);
    }
    if (tabConfig.type === 'array') {
      return renderArrayField(tabConfig);
    }
    if (tabConfig.type === 'relation') {
      return renderRelationField(tabConfig);
    }
    if (tabConfig.type === 'order') {
      return renderOrderField(tabConfig);
    }
    if (tabConfig.type === 'object-array') {
      return renderObjectArrayField(tabConfig);
    }
    if (tabConfig.type === 'custom' && customRenderers[tabConfig.renderKey]) {
      const renderer = customRenderers[tabConfig.renderKey];
      return typeof renderer === 'function' ? renderer() : renderer;
    }
    return null;
  };

  // Ordering always sits LAST in the tab bar, pushed to the right edge and
  // separated from the content tabs by a dashed rule.
  const isOrderTab = (tab) => tab?.type === 'order' || tab?.key === 'ordering';
  const tabSchema = useMemo(() => {
    const list = Array.isArray(schema) ? schema : [];
    const orderTabs = list.filter(isOrderTab);
    if (!orderTabs.length) return list;
    return [...list.filter((tab) => !isOrderTab(tab)), ...orderTabs];
  }, [schema]);

  const hasOrderTab = tabSchema.some(isOrderTab);

  const tabItems = tabSchema.map((tab, idx) => {
    const text = getLabel(tab.key, tab.label);
    const isOrder = isOrderTab(tab);
    return {
      key: String(idx),
      label:
        isOrder && tabSchema.length > 1 ? (
          <span
            style={{ display: 'inline-flex', alignItems: 'center' }}
            title={text}
          >
            <span className="tfm-order-dash" aria-hidden="true" />
            {text}
          </span>
        ) : (
          text
        ),
      children: <div style={{ padding: '2px' }}>{renderTabContent(tab)}</div>,
    };
  });

  return (
    <div
      className={`tfm-tabbar${hasOrderTab ? ' tfm-tabbar--with-order' : ''}`}
      style={{ width: '100%' }}
    >
      <style>{`
        /* Ordering tab: dashed connector + pinned to the right edge */
        .tfm-order-dash {
          display: inline-block;
          width: clamp(36px, 8vw, 150px);
          margin-right: 14px;
          border-top: 1px dashed rgba(0, 0, 0, .35);
          vertical-align: middle;
        }
        @media (max-width: 700px) {
          .tfm-order-dash { display: none; }
        }
        .tfm-tabbar--with-order .ant-tabs-nav-list { width: 100% !important; }
        /* The ordering tab is always rendered last (the ink-bar element follows
           it), so target it by its dashed connector and fall back to the
           second-to-last child for engines without :has(). */
        .tfm-tabbar--with-order .ant-tabs-tab:has(.tfm-order-dash) { margin-left: auto !important; }
        .tfm-tabbar--with-order .ant-tabs-nav-list > .ant-tabs-tab:nth-last-child(2) { margin-left: auto !important; }
      `}</style>
      <ConfigProvider
        theme={{
          token: { colorPrimary: '#000000', colorLink: '#000000', colorText: '#000000' },
          components: {
            Tabs: {
              inkBarColor: '#000000',
              itemColor: '#8a8a8a',
              itemHoverColor: '#000000',
              itemSelectedColor: '#000000',
              titleFontSize: 14,
            },
          },
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={tabItems}
          tabBarGutter={24}
          style={{ fontFamily: labelFontFamily }}
        />
      </ConfigProvider>
    </div>
  );
};

export default TabbedFormManager;