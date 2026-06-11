-- Migration 006 — Adiciona planilha_pesquisa à tabela funis
ALTER TABLE funis ADD COLUMN IF NOT EXISTS planilha_pesquisa TEXT;
