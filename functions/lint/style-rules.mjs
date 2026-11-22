import { readdirSync } from "node:fs";
import { basename, dirname } from "node:path";

/** Most files allowed directly in one folder (subfolders don't count). */
const MAX_FILES_PER_FOLDER = 8;

/** Statements that sit in a list of statements (a block, a file or a switch case). */
function statementList(node) {
  const parent = node.parent;
  if (!parent) {
    return undefined;
  }

  if (parent.type === "BlockStatement" || parent.type === "Program" || parent.type === "StaticBlock") {
    return parent.body;
  }

  if (parent.type === "SwitchCase") {
    return parent.consequent;
  }

  return undefined;
}

/** First line of a node, counting the comments directly above it. */
function startLineWithComments(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node);

  return comments.length ? comments[0].loc.start.line : node.loc.start.line;
}

/** Fix that inserts an empty line above the given line. */
function insertBlankLineAbove(sourceCode, line) {
  const index = sourceCode.getIndexFromLoc({ line, column: 0 });

  return (fixer) => fixer.insertTextBeforeRange([index, index], "\n");
}

function isBlankLine(sourceCode, line) {
  return (sourceCode.lines[line - 1] ?? "").trim() === "";
}

const blankLineAfterIf = {
  meta: { type: "layout", fixable: "whitespace", docs: { description: "Leave a blank line after every if block." } },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      IfStatement(node) {
        if (node.parent.type === "IfStatement") {
          return;
        }

        const list = statementList(node);
        const next = list?.[list.indexOf(node) + 1];
        if (!next) {
          return;
        }

        const nextLine = startLineWithComments(sourceCode, next);
        if (nextLine - node.loc.end.line < 2) {
          context.report({
            node: next,
            message: "Leave a blank line after an if block.",
            fix: insertBlankLineAbove(sourceCode, nextLine),
          });
        }
      },
    };
  },
};

const blankLineBeforeReturn = {
  meta: {
    type: "layout",
    fixable: "whitespace",
    docs: { description: "Leave a blank line before every return that isn't first in its block." },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      ReturnStatement(node) {
        const list = statementList(node);
        if (!list || list.indexOf(node) === 0) {
          return;
        }

        const line = startLineWithComments(sourceCode, node);
        if (!isBlankLine(sourceCode, line - 1)) {
          context.report({
            node,
            message: "Leave a blank line before return.",
            fix: insertBlankLineAbove(sourceCode, line),
          });
        }
      },
    };
  },
};

/** Callbacks passed straight into a call keep the signature their caller fixes. */
function isInlineCallback(node) {
  const parent = node.parent;

  return (parent.type === "CallExpression" || parent.type === "NewExpression") && parent.arguments.includes(node);
}

const objectParams = {
  meta: { type: "suggestion", docs: { description: "A function with more than one parameter takes one object." } },
  create(context) {
    function check(node) {
      if (node.params.length > 1 && !isInlineCallback(node)) {
        context.report({ node, message: "Take a single destructured object instead of several parameters." });
      }
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
      TSFunctionType: check,
      TSMethodSignature: check,
      TSDeclareFunction: check,
    };
  },
};

function isTypesFile(filename) {
  return filename.endsWith(".types.ts");
}

const typesInTypesFile = {
  meta: { type: "suggestion", docs: { description: "Named types live in a *.types.ts file next to their module." } },
  create(context) {
    const filename = context.filename;
    if (isTypesFile(filename)) {
      return {
        "Program > :not(ImportDeclaration, ExportNamedDeclaration, TSTypeAliasDeclaration, TSInterfaceDeclaration)"(
          node,
        ) {
          context.report({ node, message: "A .types.ts file holds only types." });
        },
        "ExportNamedDeclaration > :not(TSTypeAliasDeclaration, TSInterfaceDeclaration)"(node) {
          context.report({ node, message: "A .types.ts file holds only types." });
        },
      };
    }

    const report = (node) => {
      context.report({
        node,
        message: `Move this type to ${basename(filename).replace(/\.ts$/, ".types.ts")}.`,
      });
    };

    return { TSTypeAliasDeclaration: report, TSInterfaceDeclaration: report };
  },
};

const namedNestedTypes = {
  meta: {
    type: "suggestion",
    docs: { description: "Object types inside a signature are named, never nested inline." },
  },
  create(context) {
    function checkParam(param) {
      const annotation = (param.type === "AssignmentPattern" ? param.left : param).typeAnnotation?.typeAnnotation;
      if (annotation?.type !== "TSTypeLiteral") {
        return;
      }

      for (const member of annotation.members) {
        if (member.typeAnnotation?.typeAnnotation.type === "TSTypeLiteral") {
          context.report({ node: member, message: "Name this object type instead of nesting it inline." });
        }
      }
    }

    function check(node) {
      node.params.forEach(checkParam);
      if (node.returnType?.typeAnnotation.type === "TSTypeLiteral") {
        context.report({ node: node.returnType, message: "Return a named type, not an inline object type." });
      }
    }

    return { FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check };
  },
};

const noFileComment = {
  meta: { type: "suggestion", docs: { description: "A file starts with its imports, never a header comment." } },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program(node) {
        const first = node.body[0];
        if (!first) {
          return;
        }

        for (const comment of sourceCode.getCommentsBefore(first)) {
          const isDirective = /^\s*(eslint|oxlint)-/.test(comment.value);
          const documentsFirstStatement =
            first.type !== "ImportDeclaration" &&
            comment.value.startsWith("*") &&
            comment.loc.end.line === first.loc.start.line - 1;
          if (!isDirective && !documentsFirstStatement) {
            context.report({
              loc: comment.loc,
              message: "Put this comment on the thing it describes, not on the file.",
            });
          }
        }
      },
    };
  },
};

const noTypeofType = {
  meta: { type: "suggestion", docs: { description: "No typeof in types: name and export the type instead." } },
  create(context) {
    return {
      TSTypeQuery(node) {
        context.report({ node, message: "Don't derive a type with typeof. Name and export the type, then use it." });
      },
    };
  },
};

const maxFilesPerFolder = {
  meta: { type: "suggestion", docs: { description: `At most ${MAX_FILES_PER_FOLDER} files per folder.` } },
  create(context) {
    return {
      Program(node) {
        const folder = dirname(context.filename);
        // Project files at the repo root sit outside the limit.
        if (folder === context.cwd) {
          return;
        }

        const files = readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile());
        if (files.length > MAX_FILES_PER_FOLDER) {
          context.report({
            node,
            message: `${folder} has ${files.length} files (max ${MAX_FILES_PER_FOLDER}). Group them into feature folders.`,
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "style" },
  rules: {
    "blank-line-after-if": blankLineAfterIf,
    "blank-line-before-return": blankLineBeforeReturn,
    "max-files-per-folder": maxFilesPerFolder,
    "named-nested-types": namedNestedTypes,
    "no-file-comment": noFileComment,
    "no-typeof-type": noTypeofType,
    "object-params": objectParams,
    "types-in-types-file": typesInTypesFile,
  },
};

// oxlint loads JS plugins through their default export.
// eslint-disable-next-line import/no-default-export
export default plugin;
