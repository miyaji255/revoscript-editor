import type { IndentStyle } from './lexer.ts';

export interface Span {
  readonly from: number;
  readonly to: number;
  readonly line: number;
  readonly col: number;
}

export interface InvalidExpr {
  readonly kind: 'InvalidExpr';
  readonly raw: string;
  readonly span: Span;
}

export interface NumberLiteral {
  readonly kind: 'NumberLiteral';
  readonly value: number;
  readonly raw: string;
  readonly span: Span;
}

export interface BooleanLiteral {
  readonly kind: 'BooleanLiteral';
  readonly value: boolean;
  readonly raw: string;
  readonly span: Span;
}

export interface IdentifierLiteral {
  readonly kind: 'IdentifierLiteral';
  readonly name: string;
  readonly span: Span;
}

export interface VariableRef {
  readonly kind: 'VariableRef';
  readonly name: string;
  readonly span: Span;
}

export type ArgNode =
  | NumberLiteral
  | BooleanLiteral
  | IdentifierLiteral
  | InvalidExpr;

export type OperandNode =
  | VariableRef
  | NumberLiteral
  | BooleanLiteral
  | InvalidExpr;

export interface ComparisonExpr {
  readonly kind: 'ComparisonExpr';
  readonly left: OperandNode;
  readonly operator: string;
  readonly operatorSpan: Span;
  readonly right: OperandNode;
  readonly span: Span;
}

export interface LogicalExpr {
  readonly kind: 'LogicalExpr';
  readonly left: ConditionExpr;
  readonly operator: '&&' | '||' | '^';
  readonly operatorSpan: Span;
  readonly right: ConditionExpr;
  readonly span: Span;
}

export interface GroupExpr {
  readonly kind: 'GroupExpr';
  readonly inner: ConditionExpr;
  readonly span: Span;
}

export type ConditionExpr =
  | ComparisonExpr
  | LogicalExpr
  | GroupExpr
  | InvalidExpr;

export interface BlockStatement {
  readonly kind: 'BlockStatement';
  readonly name: string;
  readonly nameSpan: Span;
  span: Span;
  readonly headerSpan: Span;
  readonly indentLevel: number;
  readonly indentStyle: IndentStyle;
  readonly indentSpan: { readonly from: number; readonly to: number };
  readonly condition?: ConditionExpr;
  readonly args: readonly ArgNode[];
  readonly body: StatementNode[];
  readonly hasValidSyntax: boolean;
}

export interface CommandStatement {
  readonly kind: 'CommandStatement';
  readonly name: string;
  readonly nameSpan: Span;
  readonly span: Span;
  readonly indentLevel: number;
  readonly indentStyle: IndentStyle;
  readonly indentSpan: { readonly from: number; readonly to: number };
  readonly condition?: ConditionExpr;
  readonly args: readonly ArgNode[];
  readonly hasValidSyntax: boolean;
}

export type StatementNode = BlockStatement | CommandStatement;

export type SyntaxErrorCode =
  | 'UNBALANCED_PARENS'
  | 'MISSING_PARENS'
  | 'UNEXPECTED_TOKEN'
  | 'UNEXPECTED_INDENT'
  | 'INVALID_CONDITION'
  | 'INVALID_ARGUMENT';

export interface SyntaxErrorNode {
  readonly code: SyntaxErrorCode;
  readonly span: Span;
  readonly detail?: string;
}

export interface ProgramNode {
  readonly kind: 'Program';
  readonly body: StatementNode[];
  readonly syntaxErrors: readonly SyntaxErrorNode[];
}
