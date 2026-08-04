import sys
from pathlib import Path

import tree_sitter_javascript as tsjs
import tree_sitter as ts

class FunctionDoc:
	class OrDoc(list):
		pass

	def __init__(self, fname, fdoc):
		self.fname = fname.strip()
		self.fdoc = self._sanitize_comment(fdoc)
		self._fpnames = []
		self._fpdocs = []
		self._ordocs = []

	@property
	def has_parameters(self):
		return len(self._fpnames) + len(self._ordocs) > 0

	@property
	def all_docs(self):
		_a = 0
		_b = 0
		while _a < len(self._ordocs) or _b < len(self._fpdocs):
			_ai = self._ordocs[_a][1] if _a < len(self._ordocs) else float("inf")
			_bi = self._fpdocs[_b][1] if _b < len(self._fpdocs) else float("inf")

			if _ai == _bi:
				raise ValueError("Quantum entanglement in docs?")
			elif _ai < _bi:
				yield self.OrDoc(self._ordocs[_a][0])
				_a += 1
			else:
				yield self._fpdocs[_b][0]
				_b += 1


	@property
	def fpnames(self):
		for _name, _ in self._fpnames:
			yield _name

	@property
	def fpnames_as_str(self):
		if self.has_parameters:
			pnames = " ".join(self.fpnames)
			return f" {pnames}"
		return ""

	@property
	def fpdocs(self):
		for _doc, _ in self._fpdocs:
			yield _doc

	@property
	def ordocs(self):
		for _doc, _ in self._ordocs:
			yield _doc

	def __str__(self):
		_fs = "#{fname}{pnames}\n>`{fname}{pnames}`\n>\n> {doc}\n{parameters}\n"
		_pfs = r"> - {name}: {doc}"

		_s = ">\n> Parameters:\n"
		_is_p = False
		for _name, _doc in zip(self.fpnames, self.fpdocs):
			_is_p = True
			_s += _pfs.format(name=_name, doc=_doc)

		return _fs.format(fname=self.fname, pnames=self.fpnames_as_str, doc=self.fdoc, parameters=_s if self.has_parameters else "")

	@staticmethod
	def _sanitize_comment(comment):
		return comment.replace("/*", "").replace("*/", "").replace("//", "").strip()

	def set_parameter_name(self, pname, start_index):
		pname = self._sanitize_comment(pname)
		self._fpnames.append([pname, start_index])
		self._fpnames.sort(key=lambda x: x[1])

	def set_parameter_doc(self, pdoc, start_index):
		pdoc = self._sanitize_comment(pdoc)
		self._fpdocs.append([pdoc, start_index])
		self._fpdocs.sort(key=lambda x: x[1])

	def set_or_parameter_doc(self, opts, start_index):
		opts = list(map(self._sanitize_comment, opts))
		self._ordocs.append([opts, start_index])
		self._ordocs.sort(key=lambda x: x[1])


class MarkdownFile:
	default_text = "# Commands\n\n{commands}\n\n# Descriptions\n\n{descriptions}"
	commands_text = "- [`:{fname}{pnames}`](#{hlink})"
	description_text = "## {fname}{pnames}\n\n>`:{fname}{pnames}`\n>\n> {doc}\n>\n{parameters}\n"
	parameters_text = "> Parameters:\n"
	p_descriptions_text = "> - {name}: {doc}\n"
	or_parameters_seperator = " | "

	@classmethod
	def populate(cls, fdocs: list[FunctionDoc]):
		def deconstruct(n: FunctionDoc):
			_s = ""
			if n.has_parameters:
				_s = cls.parameters_text
				for _name, _doc in zip(n.fpnames, n.all_docs):
					if isinstance(_doc, FunctionDoc.OrDoc):
						_doc = cls.or_parameters_seperator.join(_doc)
					_s += cls.p_descriptions_text.format(name=_name, doc=_doc)

			return { "fname":n.fname, "pnames":n.fpnames_as_str, "doc": n.fdoc, "parameters": _s}

		commands = []
		descriptions = []

		for fdoc in fdocs:
			unpacked = deconstruct(fdoc)
			hlink = "{fname}{pnames}".format(**unpacked).replace(" ", "-").lower()
			commands.append(cls.commands_text.format(hlink=hlink, **unpacked))
			descriptions.append(cls.description_text.format(**unpacked))

		return cls.default_text.format(commands="\n".join(commands), descriptions="\n".join(descriptions))

	@staticmethod
	def save(fp, fdocs: list[FunctionDoc]):
		fp.write(MarkdownFile.populate(fdocs))

	@staticmethod
	def _format_desc():
		pass

class Linter:
	def __init__(self, program):
		self.program = program
		self.function_docs = None

	def create_docs(self, refresh = False):
		if not refresh and self.function_docs is not None:
			return self.function_docs

		def flatten(lst):
			ret = []
			for item in lst:
				flat = [item]
				if isinstance(item, list):
					flat = flatten(item)
				ret.append(flat)

			return sum(ret, [])


		JS_LANG = ts.Language(tsjs.language())

		query = ts.Query(JS_LANG, """
		( ( identifier ) @cn (#eq? @cn "NamedArgs")
			( class_body
            	( field_definition 
                    ( property_identifier ) @pdoc_name
                    [
                    	( new_expression
                            ( identifier ) @class_name (#eq? @class_name "CommandArg")
                            ( arguments
                                ( comment ) @pdoc_string
                            )
                        )
                        ( call_expression ) @or_exp
                    ]
                )
            )
		)

		( new_expression
			( identifier ) @class_name (#eq? @class_name "CommandSchema")
			( arguments
		        . ( comment ) @fdoc_string
		        ( comment )* @fdoc_pnames
		        ( string ) @fname
		        ( array ) @p_arr
		    )
		)
		""")
		elements_query = ts.Query(JS_LANG, """
		( array
		    [
		        ( new_expression
		            ( arguments
		                ( comment ) @inline_pdoc_string
		            )
		        )
		        ( member_expression
		            ( property_identifier ) @pname
		        )
		        ( call_expression
		            ( arguments ) 
		        ) @or_exp
			]?
		)
		""")
		or_query = ts.Query(JS_LANG, """
        ( call_expression ( member_expression ( identifier ) )
			( arguments
				[
			        ( new_expression
			            ( arguments
			                ( comment ) @or_inline_pdoc_string
			            )
			        )
			        ( member_expression
			            ( property_identifier ) @or_pname
			        )
			    ]
			)
		)
		""")

		parser = ts.Parser(JS_LANG)
		tree = parser.parse(bytes(self.program, "utf-8"))

		query.disable_capture("cn")
		query.disable_capture("class_name")
		query_cursor = ts.QueryCursor(query)
		matches = query_cursor.matches(tree.root_node)

		pdefs, fdefs = [], []
		for m_idx, current_match in matches:
			match m_idx:
				case 0:
					pdefs.append(current_match)
				case 1:
					fdefs.append(current_match)

		named_parameters = {}
		function_docs = []
		for pmatch in pdefs:
			pdoc_name, pdoc_string, or_exp = pmatch["pdoc_name"][0], pmatch.get("pdoc_string", None), pmatch.get("or_exp", None)

			# Get parameter doc string if defined
			if pdoc_string is not None:
				pdoc_string = pdoc_string[0]
				named_parameters.update({pdoc_name.text: pdoc_string.text.decode("utf-8")})
			elif or_exp is not None:
				or_exp = or_exp[0]

				parsed_or_exp = ts.QueryCursor(or_query).captures(or_exp)

				or_internal_pnames = parsed_or_exp.get("or_pname", [])
				or_ipdoc_strings = parsed_or_exp.get("or_inline_pdoc_string", [])

				or_docs = []
				for or_internal_pname in or_internal_pnames:
					or_docs.append(named_parameters[or_internal_pname.text])

				for or_pdoc_string in or_ipdoc_strings:
					or_docs.append(or_pdoc_string.text.decode("utf-8"))

				named_parameters.update({pdoc_name.text: or_docs})

			else:
				raise Exception(f"{pdoc_name.text} is neither an 'or expression' or has a doc string.")


		for fmatch in fdefs:
			[fname], [fdoc] = fmatch["fname"], fmatch["fdoc_string"]
			parsed_fname = fname.text.decode("utf-8").replace('"', "")

			current_doc = FunctionDoc(parsed_fname, fdoc.text.decode("utf-8"))

			pdoc_names = fmatch.get("fdoc_pnames", [])
			[p_arr] = fmatch["p_arr"]

			parsed_p_arr = ts.QueryCursor(elements_query).captures(p_arr)

			internal_pnames = parsed_p_arr.get("pname", [])
			ipdoc_strings = parsed_p_arr.get("inline_pdoc_string", [])

			# If any or parameters are present handle them
			or_exps = parsed_p_arr.get("or_exp", [])
			for or_exp in or_exps:
				parsed_or_exp = ts.QueryCursor(or_query).captures(or_exp)

				or_internal_pnames = parsed_or_exp.get("or_pname", [])
				or_ipdoc_strings = parsed_or_exp.get("or_inline_pdoc_string", [])

				or_docs = []
				start_byte = -1
				for or_internal_pname in or_internal_pnames:
					or_docs.append(named_parameters[or_internal_pname.text])
					start_byte = or_internal_pname.start_byte

				for or_pdoc_string in or_ipdoc_strings:
					or_docs.append(or_pdoc_string.text.decode("utf-8"))
					start_byte = or_pdoc_string.start_byte

				or_docs = flatten(or_docs)
				current_doc.set_or_parameter_doc(or_docs, start_byte)

			pcnt = sum(map(len, [internal_pnames, ipdoc_strings, or_exps]))
			if len(pdoc_names) != pcnt:
				raise Exception(f"Doc string parameter name count and actual parameter count mismatch at {parsed_fname}, { len(pdoc_names)}, { pcnt }")

			for pdoc_name in pdoc_names:
				current_doc.set_parameter_name(pdoc_name.text.decode("utf-8"), pdoc_name.start_byte)

			for internal_pname in internal_pnames:
				doc = named_parameters[internal_pname.text]
				if isinstance(doc, list):
					doc = flatten(doc)
					current_doc.set_or_parameter_doc(doc, internal_pname.start_byte)
				else:
					current_doc.set_parameter_doc(doc, internal_pname.start_byte)

			for pdoc_string in ipdoc_strings:
				current_doc.set_parameter_doc(pdoc_string.text.decode("utf-8"), pdoc_string.start_byte)

			function_docs.append(current_doc)

		self.function_docs = function_docs
		return self.function_docs

	def lint(self):
		if self.function_docs is None:
			self.create_docs()

		fs = []
		for fdoc in self.function_docs:
			if fdoc.fname in fs:
				raise ValueError(f"{fdoc.fname} already exists")
			fs.append(fdoc.fname)

		return True


TARGET_FNAME = sys.argv[1]
DOC_FNAME = sys.argv[2]

if __name__ == '__main__':
	with open(TARGET_FNAME, "r", encoding="utf-8") as f:
		program = "\n".join(f.readlines())

	linter = Linter(program)
	docs = linter.create_docs()
	if linter.lint():
		print("Linting done.", "Creating docs..", sep="\n")

		Path(DOC_FNAME).parent.mkdir(parents=True, exist_ok=True)
		with open(DOC_FNAME, "w") as f:
			MarkdownFile.save(f, docs)
		print(f"Docs saved at {DOC_FNAME}...")

	print("Exiting")