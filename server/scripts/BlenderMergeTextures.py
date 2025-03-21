import bpy
import sys
import os

def importModel(file_path, file_extension):
    #import scene
    if file_extension == '.obj':
        bpy.ops.wm.obj_import(filepath=file_path)
    elif file_extension == '.ply':
        bpy.ops.import_mesh.ply(filepath=file_path)
    elif file_extension == '.stl':
        bpy.ops.import_mesh.stl(filepath=file_path)
    elif file_extension == '.x3d':
        bpy.ops.import_scene.x3d(filepath=file_path)
    elif file_extension == '.dae':
        bpy.ops.wm.collada_import(filepath=file_path)
    elif file_extension == '.fbx':
        bpy.ops.import_scene.fbx(filepath=file_path)
    elif file_extension == '.glb' or file_extension == '.gltf':
        bpy.ops.import_scene.gltf(filepath=file_path)
    else:
        print("Error: Unsupported file type: " + file_extension)
        sys.exit(1)

def run():
    # get rid of default objects
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge()
    bpy.ops.outliner.orphans_purge()
    bpy.ops.outliner.orphans_purge()

    #get args
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]

    #get import file extension
    #import
    filename, file_extension = os.path.splitext(argv[0])
    file_extension = file_extension.lower()
    importModel(argv[0], file_extension)

    path = bpy.data.filepath
    dir = os.path.dirname(path)

    # apply any empty transforms and remove
    bpy.ops.object.select_by_type(type='EMPTY')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.delete(use_global=False)

    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.select_set(True)
            bpy.context.view_layer.objects.active = ob
        else:
            if ob.type != 'EMPTY':
                ob.select = False
    bpy.ops.object.join()

    # Check if we have a diffuse texture
    hasDiffuse = False
    for mat in bpy.data.materials:
        nodetree = mat.node_tree
        if nodetree:
            for node in nodetree.nodes:
                if node.type == 'TEX_IMAGE':
                    for output in node.outputs:
                        for link in output.links:
                            if link.to_socket.name == 'Base Color':
                                hasDiffuse = True

    # Get the active object
    obj = bpy.context.active_object

    if hasDiffuse:
        # Enter edit mode and create a new UV map
        bpy.ops.object.editmode_toggle()
        bpy.context.scene.tool_settings.use_uv_select_sync = True
        bpy.ops.mesh.select_all(action='SELECT')
        uv_atlas = bpy.context.object.data.uv_layers.new(name='UVAtlas')

        # set new uv map as active
        obj.data.uv_layers.active = uv_atlas

        # Pack the UV islands
        bpy.ops.uv.pack_islands(margin=0.001)

        # Enter object mode
        bpy.ops.object.editmode_toggle()

        # Create a new image texture
        new_texture = bpy.data.images.new(name='TextureAtlas', width=8192, height=8192, alpha=False, float_buffer=False)

        # Loop through each material slot and add a new image texture node to each one
        for slot in obj.material_slots:
            material = slot.material
            node_tree = material.node_tree
            node_texture = node_tree.nodes.new(type='ShaderNodeTexImage')
            node_texture.image = new_texture
            node_tree.nodes.active = node_texture


        # Get Setup to Bake using Cycles Render Engine
        # Set render engine to Cycles
        bpy.context.scene.render.engine = 'CYCLES'
        # Set the preferences to allow CUDA (I think)
        bpy.context.preferences.addons['cycles'].preferences.compute_device_type = 'CUDA'
        #bpy.context.preferences.addons['cycles'].preferences.devices[0].use = True
        # Set Cycles to use the GPU
        bpy.context.scene.cycles.device = 'GPU'
        bpy.context.scene.cycles.use_denoising = False


        # Set bake options and bake diffuse color
        bpy.context.scene.cycles.bake_type = 'DIFFUSE'
        bpy.context.scene.render.bake.use_split_materials = False
        bpy.context.scene.render.bake.use_pass_direct = False
        bpy.context.scene.render.bake.use_pass_indirect = False
        bpy.context.scene.render.bake.use_pass_color = True

        # Start the bake process
        bpy.ops.object.bake(type='DIFFUSE')

        # Save texture
        texture_path = os.path.join(dir, argv[1])
        new_texture.filepath_raw = texture_path
        new_texture.file_format = 'PNG'
        new_texture.save()
        print("Saving texture: " + texture_path)

        # Add unified material
        obj.data.materials.clear()
        material = bpy.data.materials.new('mergedMat')
        material.use_nodes = True
        node_tree = material.node_tree
        node_texture = node_tree.nodes.new(type='ShaderNodeTexImage')
        node_texture.image = new_texture
        links = node_tree.links
        links.new(node_texture.outputs[0], node_tree.nodes[0].inputs["Base Color"])
        obj.active_material = material


        # set the texture atlas uv map as active
        obj.data.uv_layers["UVAtlas"].active_render = True
    else:
        material = bpy.data.materials.new('mergedMat')
        material.use_nodes = True
        obj.active_material = material

    #create save file name
    try: #check for provided output filename
        mod_filename = argv[2]
    except IndexError:
        mod_filename = filename + identifier + file_extension
    save_file = os.path.join(dir, mod_filename)

    #save scene
    bpy.ops.wm.obj_export(filepath=save_file, up_axis="Z", forward_axis="Y", check_existing=False, export_materials=True)

try:
    run()
except Exception as e:
    print(e)
    sys.exit(1)
