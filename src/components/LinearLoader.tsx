import React from 'react';
import {
    FileTextIcon,
    BarChart3Icon,
    BrainIcon,
    Globe2Icon,
    TrendingUpIcon
} from '@/components/Icons';
import { useLanguage } from '@/contexts/LanguageContext';

const LOADING_STEP_ICONS = [
    { icon: FileTextIcon, color: 'from-glacier-500 to-glacier-600' },
    { icon: BarChart3Icon, color: 'from-gemini-purple to-gemini-pink' },
    { icon: BrainIcon, color: 'from-gemini-blue to-gemini-purple' },
    { icon: Globe2Icon, color: 'from-glacier-400 to-gemini-blue' },
    { icon: TrendingUpIcon, color: 'from-gemini-green to-glacier-500' },
];

export const LOADING_STEPS = [
    { text: '正在获取企业基本信息', icon: FileTextIcon, color: 'from-glacier-500 to-glacier-600' },
    { text: '正在分析财务数据', icon: BarChart3Icon, color: 'from-gemini-purple to-gemini-pink' },
    { text: 'AI 正在深度分析', icon: BrainIcon, color: 'from-gemini-blue to-gemini-purple' },
    { text: '正在搜索最新动态', icon: Globe2Icon, color: 'from-glacier-400 to-gemini-blue' },
    { text: '正在生成研究报告', icon: TrendingUpIcon, color: 'from-gemini-green to-glacier-500' },
];

export function LinearLoader({ step, totalSteps }: { step: number; totalSteps: number }) {
    const { t } = useLanguage();

    const stepTexts = [
        t.home.loading.step1,
        t.home.loading.step2,
        t.home.loading.step3,
        t.home.loading.step4,
        t.home.loading.step5,
    ];

    const currentStepMeta = LOADING_STEP_ICONS[step] || LOADING_STEP_ICONS[LOADING_STEP_ICONS.length - 1];
    const Icon = currentStepMeta.icon;
    const currentText = stepTexts[step] || stepTexts[stepTexts.length - 1];
    const progress = ((step + 1) / totalSteps) * 100;

    return (
        <div className="w-full max-w-sm">
            {/* Icon & text */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-glacier-500/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-glacier-500" />
                </div>
                <span className="text-sm text-mist-300">{currentText}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-glacier-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Progress text */}
            <div className="flex items-center justify-between mt-3 text-xs text-mist-600">
                <span>{step + 1} / {totalSteps}</span>
                <span>{t.home.loading.estimate}</span>
            </div>
        </div>
    );
}
