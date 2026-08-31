import React, { useContext } from "react";
import { motion } from 'framer-motion';
import { LanguageContext } from "../contexts/LanguageContext";
import useFont from "@/hooks/useFont";
import useBackgroundColor from "@/hooks/useBackgroundColor";
import { useReverseTheme } from '@/hooks/useReverseTheme';
import { DeviceContext } from "@/components/contexts/DeviceContext";
import footerConfig from "@/data/footer.json";   // 导入配置文件

const Footer = () => {
  const { isCn, isLoading } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const { contentFontFamily } = useFont('13px');
  const { colors } = useReverseTheme();

  const { getBackgroundStyle } = useBackgroundColor('transparent', {
    useCustomColor: true
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  // 读取当前语言的配置
  const langData = isCn ? footerConfig.cn : footerConfig.en;
  const { startYear, companyName, rightsText } = langData;
  const currentYear = new Date().getFullYear();

  // 构造版权文本
  const yearRange = startYear === currentYear
    ? `${currentYear}`
    : `${startYear}–${currentYear}`;
  const copyright = isLoading
    ? `© ${currentYear} ${isCn ? '' : ''}. ${rightsText}.`   // 加载中占位（保留原逻辑）
    : `© ${yearRange} ${companyName}. ${rightsText}.`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="fixed bottom-0 left-0 w-full z-50"
      style={{
        backgroundColor: colors.background,
        borderTop: `1px solid ${colors.border || '#e0e0e0'}`,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="flex items-center justify-center px-4 py-2"
        style={{ backgroundColor: colors.background }}
      >
        <div 
          className="text-xs tracking-wider uppercase"
          style={{
            color: colors.text,
            fontFamily: contentFontFamily,
            fontSize: '11px',
            backgroundColor: colors.background
          }}
        >
          {copyright}
        </div>
      </div>
    </motion.div>
  );
};

export default Footer;
