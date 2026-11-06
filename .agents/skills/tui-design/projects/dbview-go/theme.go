package main

import "github.com/charmbracelet/lipgloss"

// theme is a palette, not a redesign: structure and spacing never change.
// Components read styles from the active theme so cycling is a field swap.
type theme struct {
	name    string
	base    lipgloss.Style
	muted   lipgloss.Style
	accent  lipgloss.Style
	success lipgloss.Style
	danger  lipgloss.Style
	selected lipgloss.Style
	border  lipgloss.Style
	barBg   lipgloss.Color
}

var themes = []theme{
	{
		name:     "mono",
		base:     lipgloss.NewStyle().Foreground(lipgloss.Color("252")),
		muted:    lipgloss.NewStyle().Foreground(lipgloss.Color("243")),
		accent:   lipgloss.NewStyle().Foreground(lipgloss.Color("255")).Bold(true),
		success:  lipgloss.NewStyle().Foreground(lipgloss.Color("255")),
		danger:   lipgloss.NewStyle().Foreground(lipgloss.Color("252")).Bold(true),
		selected: lipgloss.NewStyle().Foreground(lipgloss.Color("255")).Bold(true),
		border:   lipgloss.NewStyle().BorderForeground(lipgloss.Color("243")),
		barBg:    lipgloss.Color("236"),
	},
	{
		name:     "ocean",
		base:     lipgloss.NewStyle().Foreground(lipgloss.Color("152")),
		muted:    lipgloss.NewStyle().Foreground(lipgloss.Color("243")),
		accent:   lipgloss.NewStyle().Foreground(lipgloss.Color("117")).Bold(true),
		success:  lipgloss.NewStyle().Foreground(lipgloss.Color("80")),
		danger:   lipgloss.NewStyle().Foreground(lipgloss.Color("210")),
		selected: lipgloss.NewStyle().Foreground(lipgloss.Color("117")).Bold(true),
		border:   lipgloss.NewStyle().BorderForeground(lipgloss.Color("60")),
		barBg:    lipgloss.Color("236"),
	},
	{
		name:     "ember",
		base:     lipgloss.NewStyle().Foreground(lipgloss.Color("223")),
		muted:    lipgloss.NewStyle().Foreground(lipgloss.Color("243")),
		accent:   lipgloss.NewStyle().Foreground(lipgloss.Color("215")).Bold(true),
		success:  lipgloss.NewStyle().Foreground(lipgloss.Color("150")),
		danger:   lipgloss.NewStyle().Foreground(lipgloss.Color("174")),
		selected: lipgloss.NewStyle().Foreground(lipgloss.Color("215")).Bold(true),
		border:   lipgloss.NewStyle().BorderForeground(lipgloss.Color("131")),
		barBg:    lipgloss.Color("235"),
	},
}

func themeAt(i int) theme {
	if len(themes) == 0 {
		return themes[0]
	}
	i = ((i % len(themes)) + len(themes)) % len(themes)
	return themes[i]
}
