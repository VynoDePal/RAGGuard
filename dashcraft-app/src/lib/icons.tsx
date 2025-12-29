'use client'

import {useEffect, useState} from 'react'
import {useTheme} from 'next-themes'
import * as Outline from '@heroicons/react/24/outline'
import * as Solid from '@heroicons/react/24/solid'
import {type ComponentType, type SVGProps} from 'react'

export type IconName =
	| 'chart'
	| 'users'
	| 'bell'
	| 'settings'
	| 'envelope'
	| 'envelope-open'
	| 'star'
	| 'credit-card'
	| 'calendar'
	| 'tag'
	| 'chat'
	| 'chat-legacy'
	| 'server'
	| 'cpu'
	| 'language'
	| 'check-circle'
	| 'clock'
	| 'x-circle'
	| 'arrow-uturn-left'
	// RAGGuard icons
	| 'shield'
	| 'document'
	| 'sparkles'
	| 'paper-airplane'
	| 'arrow-path'
	| 'exclamation-triangle'
	| 'check-badge'
	| 'magnifying-glass'
	| 'folder-open'
	| 'plus'
	| 'trash'
	| 'chevron-right'
	| 'chevron-down'
	| 'currency-dollar'
	| 'x-mark'
	| 'cloud-arrow-up'

const outlineMap: Record<IconName, ComponentType<SVGProps<SVGSVGElement>>> = {
	chart: Outline.ChartBarIcon,
	users: Outline.UsersIcon,
	bell: Outline.BellIcon,
	settings: Outline.Cog6ToothIcon,
	envelope: Outline.EnvelopeIcon,
	'envelope-open': Outline.EnvelopeOpenIcon,
	star: Outline.StarIcon,
	'credit-card': Outline.CreditCardIcon,
	calendar: Outline.CalendarDaysIcon,
	tag: Outline.TagIcon,
	chat: Outline.ChatBubbleLeftRightIcon,
	'chat-legacy': Outline.ChatBubbleOvalLeftEllipsisIcon,
	server: Outline.ServerStackIcon,
	cpu: Outline.CpuChipIcon,
	language: Outline.LanguageIcon,
	'check-circle': Outline.CheckCircleIcon,
	clock: Outline.ClockIcon,
	'x-circle': Outline.XCircleIcon,
	'arrow-uturn-left': Outline.ArrowUturnLeftIcon,
	// RAGGuard icons
	shield: Outline.ShieldCheckIcon,
	document: Outline.DocumentTextIcon,
	sparkles: Outline.SparklesIcon,
	'paper-airplane': Outline.PaperAirplaneIcon,
	'arrow-path': Outline.ArrowPathIcon,
	'exclamation-triangle': Outline.ExclamationTriangleIcon,
	'check-badge': Outline.CheckBadgeIcon,
	'magnifying-glass': Outline.MagnifyingGlassIcon,
	'folder-open': Outline.FolderOpenIcon,
	plus: Outline.PlusIcon,
	trash: Outline.TrashIcon,
	'chevron-right': Outline.ChevronRightIcon,
	'chevron-down': Outline.ChevronDownIcon,
	'currency-dollar': Outline.CurrencyDollarIcon,
	'x-mark': Outline.XMarkIcon,
	'cloud-arrow-up': Outline.CloudArrowUpIcon,
}

const solidMap: Record<IconName, ComponentType<SVGProps<SVGSVGElement>>> = {
	chart: Solid.ChartBarIcon,
	users: Solid.UsersIcon,
	bell: Solid.BellIcon,
	settings: Solid.Cog6ToothIcon,
	envelope: Solid.EnvelopeIcon,
	'envelope-open': Solid.EnvelopeOpenIcon,
	star: Solid.StarIcon,
	'credit-card': Solid.CreditCardIcon,
	calendar: Solid.CalendarDaysIcon,
	tag: Solid.TagIcon,
	chat: Solid.ChatBubbleLeftRightIcon,
	'chat-legacy': Solid.ChatBubbleOvalLeftEllipsisIcon,
	server: Solid.ServerStackIcon,
	cpu: Solid.CpuChipIcon,
	language: Solid.LanguageIcon,
	'check-circle': Solid.CheckCircleIcon,
	clock: Solid.ClockIcon,
	'x-circle': Solid.XCircleIcon,
	'arrow-uturn-left': Solid.ArrowUturnLeftIcon,
	// RAGGuard icons
	shield: Solid.ShieldCheckIcon,
	document: Solid.DocumentTextIcon,
	sparkles: Solid.SparklesIcon,
	'paper-airplane': Solid.PaperAirplaneIcon,
	'arrow-path': Solid.ArrowPathIcon,
	'exclamation-triangle': Solid.ExclamationTriangleIcon,
	'check-badge': Solid.CheckBadgeIcon,
	'magnifying-glass': Solid.MagnifyingGlassIcon,
	'folder-open': Solid.FolderOpenIcon,
	plus: Solid.PlusIcon,
	trash: Solid.TrashIcon,
	'chevron-right': Solid.ChevronRightIcon,
	'chevron-down': Solid.ChevronDownIcon,
	'currency-dollar': Solid.CurrencyDollarIcon,
	'x-mark': Solid.XMarkIcon,
	'cloud-arrow-up': Solid.CloudArrowUpIcon,
}

/**
 * Icon
 * Utilise la variante outline en light et solid en dark.
 */
export function Icon({name, className}: {name: IconName; className?: string}) {
	const {resolvedTheme} = useTheme()
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	// Fallback stable (outline) pour SSR et premier render client
	const Fallback = outlineMap[name]
	if (!mounted) return <Fallback className={className} aria-hidden />

	const Comp = resolvedTheme === 'dark' ? solidMap[name] : outlineMap[name]
	return <Comp className={className} aria-hidden />
}
